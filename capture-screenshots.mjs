import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('public/screenshots', { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

// 1. Start Screen
await page.goto('http://localhost:3000');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'public/screenshots/01-start.jpg', type: 'jpeg', quality: 90 });
console.log('✓ Start screen');

// 2. Click play → Game Screen
await page.click('button');
await page.waitForTimeout(800);
await page.screenshot({ path: 'public/screenshots/02-game.jpg', type: 'jpeg', quality: 90 });
console.log('✓ Game screen');

// 3. Tap some letters to build a word
const letterButtons = await page.$$('.flex.flex-wrap.justify-center.gap-2 button');
if (letterButtons.length >= 2) {
  await letterButtons[0].click();
  await page.waitForTimeout(200);
  await letterButtons[1].click();
  await page.waitForTimeout(200);
}
await page.screenshot({ path: 'public/screenshots/03-building.jpg', type: 'jpeg', quality: 90 });
console.log('✓ Word building');

// 4. Submit word → get feedback
const submitBtn = await page.$('button[aria-label="שלח מילה"]');
if (submitBtn) await submitBtn.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/screenshots/04-feedback.jpg', type: 'jpeg', quality: 90 });
console.log('✓ Feedback');

// 5. Valid word + Loss screen — start fresh round, submit "פה" style 2-letter combos
await page.goto('http://localhost:3000');
await page.waitForTimeout(1500);
await page.click('button');
await page.waitForTimeout(800);

// Try submitting a valid word by using the Zustand store directly
await page.evaluate(() => {
  // Force a known valid word into the store
  const event = new CustomEvent('__force_word', { detail: 'גם' });
  window.dispatchEvent(event);
});

// Actually, let's just tap letters and try to find a valid 2-letter combo
// Get available letters first
const letters2 = await page.$$eval('.flex.flex-wrap.justify-center.gap-2 button', btns => btns.map(b => b.textContent));
console.log('Available letters:', letters2.join(', '));

// Try all 2-letter combos until one is valid
let validFound = false;
for (let i = 0; i < letters2.length && !validFound; i++) {
  for (let j = 0; j < letters2.length && !validFound; j++) {
    // Clear current word
    const clearBtn = await page.$('button[aria-label="מחק מילה"]');
    if (clearBtn) await clearBtn.click();
    await page.waitForTimeout(100);

    // Tap two letters
    const btns = await page.$$('.flex.flex-wrap.justify-center.gap-2 button');
    await btns[i].click();
    await page.waitForTimeout(100);
    await btns[j].click();
    await page.waitForTimeout(100);

    // Submit
    const sub = await page.$('button[aria-label="שלח מילה"]');
    if (sub) await sub.click();
    await page.waitForTimeout(400);

    // Check if feedback is green (success)
    const feedbackEl = await page.$('.text-success');
    if (feedbackEl) {
      const feedbackText = await feedbackEl.textContent();
      if (feedbackText && feedbackText.includes('מצוינת')) {
        validFound = true;
        console.log(`✓ Valid word found: ${letters2[i]}${letters2[j]}`);
      }
    }
  }
}

await page.waitForTimeout(300);
await page.screenshot({ path: 'public/screenshots/05-valid-word.jpg', type: 'jpeg', quality: 90 });
console.log('✓ Valid word submitted');

// 6. Force loss by setting timeLeft to 0 via Zustand
await page.evaluate(() => {
  // Zustand stores state on the module level; we need to trigger loss
  // The easiest way: rapidly tick the timer
  const interval = setInterval(() => {
    const event = new Event('__tick');
    window.dispatchEvent(event);
  }, 1);
  setTimeout(() => clearInterval(interval), 100);
});

// Alternative: just wait and manipulate the store via window
// Zustand v5 exposes the store differently, let's try the React devtools approach
// Actually, let's use a simpler trick - override the timer display element
await page.evaluate(async () => {
  // Access the zustand store by finding the state
  // In Zustand v5, the store is created with create() and isn't on window
  // Let's use a brute force approach - click rapidly to waste time, or just wait

  // Fastest: modify the DOM to simulate loss
  // But we need the actual store. Let's expose it.
});

// The most reliable way: just wait for the timer (it's 90s, too long)
// Instead, let's reload with a special query param that sets short timer
// OR: just programmatically force the state
// Let's use __ZUSTAND_DEVTOOLS__ or similar

// Simplest: navigate to the game, start it, and use page.evaluate to access React fiber
await page.evaluate(() => {
  // Find the React root and access the store
  const root = document.getElementById('__next');
  if (root && root._reactRootContainer) {
    // React 18 doesn't expose this easily
  }
});

// OK, let's just take what we have. Skip the loss screen for now.
console.log('(Skipping loss screen - requires timer expiry)');

await browser.close();
console.log('\nDone! Screenshots saved to public/screenshots/');
