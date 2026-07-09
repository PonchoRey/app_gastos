const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
        console.log(`BROWSER PAGE ERROR: ${error.message}`);
    });

    page.on('requestfailed', request => {
        console.log(`BROWSER REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
    });

    page.on('request', request => {
        if (request.url().includes('.wasm')) {
            console.log(`BROWSER REQUESTING WASM: ${request.url()}`);
        }
    });

    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`BROWSER HTTP ERROR: ${response.status()} ${response.url()}`);
        }
    });

    console.log("Navigating to localhost...");
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    console.log("Clicking theme button...");
    try {
        await page.click('#themeToggleBtn');
        await new Promise(r => setTimeout(r, 1000));
        console.log("Button clicked successfully");
    } catch (e) {
        console.log("Error clicking button: " + e.message);
    }
    
    await browser.close();
    console.log("Done");
})();
