import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);

test("the daily game works while sign-in is unavailable and recovers when it loads", { timeout: 45_000 }, async () => {
  await mkdir("work", { recursive: true });
  const directory = await mkdtemp(resolve("work/loading-test-"));
  let browser, server;
  try {
    // Exercise the actual page with Clerk stuck in its initial, unloaded state.
    // The other state transitions check that this fallback preserves account isolation.
    const entry = process.env.TEST_PAGE ?? "app/page.tsx";
    await build({
      stdin: {
        contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Home from ${JSON.stringify(resolve(entry))}; createRoot(document.getElementById('root')).render(<Home/>);`,
        resolveDir: process.cwd(), loader: "tsx",
      },
      outfile: resolve(directory, "app.js"), bundle: true, jsx: "automatic",
      define: { "process.env.NODE_ENV": '"development"' },
      plugins: [{ name: "auth-state", setup(builder) {
        builder.onResolve({ filter: /^@clerk\/clerk-react$/ }, () => ({ path: "auth", namespace: "fixture" }));
        builder.onLoad({ filter: /^auth$/, namespace: "fixture" }, () => ({
          contents: `import {createElement, useSyncExternalStore} from 'react';
            const getToken = async () => 'test-token';
            const snapshot = () => window.testAuthState ?? 'loading';
            const subscribe = cb => {window.addEventListener('test-auth',cb);return()=>window.removeEventListener('test-auth',cb)};
            export function useAuth() {
              const state=useSyncExternalStore(subscribe,snapshot,()=> 'loading');
              const isLoaded=state!=='loading';
              const userId=isLoaded?(state==='signed-out'?null:state):undefined;
              return {isLoaded,userId,isSignedIn:isLoaded?!!userId:undefined,getToken};
            }
            export const SignInButton=({children})=>children;
            export const UserButton=()=>createElement('span',null,'Account');
            export const SignedOut=({children})=>useAuth().userId===null?children:null;
            export const SignedIn=({children})=>useAuth().isSignedIn?children:null;`,
          resolveDir: process.cwd(), loader: "js",
        }));
        builder.onResolve({ filter: /^@vercel\/speed-insights\/next$/ }, () => ({ path: "analytics", namespace: "fixture" }));
        builder.onLoad({ filter: /^analytics$/, namespace: "fixture" }, () => ({ contents: "export const SpeedInsights=()=>null;", loader: "js" }));
      } }],
    });
    await build({
      stdin: { contents: "export {getDailyQuestion} from './data/question-bank'; export {gradeLocally} from './lib/local-grader';", resolveDir: process.cwd(), loader: "ts" },
      outfile: resolve(directory, "data.cjs"), bundle: true, platform: "node", format: "cjs",
    });
    const { getDailyQuestion, gradeLocally } = require(resolve(directory, "data.cjs"));
    const day = "2026-09-19";
    const electrical = getDailyQuestion("electrical", day);
    const source = await readFile(resolve(directory, "app.js"));
    const cssFiles = await readdir(".next/static/css");
    const css = await readFile(resolve(".next/static/css", cssFiles[0]));
    let accountRequests = 0;
    server = createServer(async (request, response) => {
      const url = new URL(request.url, "http://localhost");
      if (url.pathname === "/api/grade") {
        let body = "";
        for await (const chunk of request) body += chunk;
        const { career, questionId, answer } = JSON.parse(body);
        const question = getDailyQuestion(career, day);
        assert.equal(questionId, question.id);
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(gradeLocally(question, answer)));
      } else if (url.pathname === "/api/progress") {
        accountRequests++;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ dates: [], latest: null }));
      } else if (url.pathname === "/app.js") {
        response.setHeader("Content-Type", "text/javascript"); response.end(source);
      } else if (url.pathname === "/app.css") {
        response.setHeader("Content-Type", "text/css"); response.end(css);
      } else {
        response.setHeader("Content-Type", "text/html");
        response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
      }
    });
    await new Promise(done => server.listen(0, "127.0.0.1", done));
    browser = await chromium.launch({
      headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
      args: process.env.BROWSER_TEST_ARGS ? JSON.parse(process.env.BROWSER_TEST_ARGS) : ["--no-sandbox"],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date(`${day}T16:00:00Z`) });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator("#answer").waitFor({ timeout: 5000 });
    assert.equal(await page.locator("#answer").isEnabled(), true);
    assert.equal(await page.getByText("Loading today’s interview…", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Guest mode", { exact: true }).count(), 1);
    assert.equal(accountRequests, 0, "An unloaded session must not request account history");

    await page.getByRole("tab", { name: "Electrical Engineering" }).click();
    await page.getByRole("heading", { name: electrical.question, exact: true }).waitFor();
    await page.locator("#answer").fill(electrical.ideal);
    await page.getByRole("button", { name: "Submit Answer" }).click();
    if (electrical.ideal.length > 420) await page.getByRole("button", { name: "Check My Rewrite" }).click();
    await page.locator(".results").waitFor();
    assert.match(await page.locator(".header-stats").innerText(), /1 completed/);
    await page.reload();
    await page.locator(".results").waitFor();
    assert.equal(accountRequests, 0, "Guest results must stay local");

    // Recovering as a signed-out visitor keeps the same guest result.
    await page.evaluate(() => { window.testAuthState = "signed-out"; window.dispatchEvent(new Event("test-auth")); });
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    assert.equal(await page.locator(".results").count(), 1);
    // Recovering as an account switches to that account's own progress.
    await page.evaluate(() => { window.testAuthState = "user_A"; window.dispatchEvent(new Event("test-auth")); });
    await page.locator("#answer").waitFor();
    await page.waitForFunction(() => !document.querySelector("#answer").disabled);
    assert.equal(await page.locator("#answer").inputValue(), "");
    assert.match(await page.locator(".header-stats").innerText(), /0 completed/);
    assert.equal(accountRequests, 1);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => { window.testAuthState = "loading"; window.dispatchEvent(new Event("test-auth")); });
    await page.getByRole("tab", { name: "Hardware Engineering", exact: true }).click();
    await page.locator("#answer").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator("#answer").isEnabled(), true);
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(done => server.close(done));
    await rm(directory, { recursive: true, force: true });
  }
});
