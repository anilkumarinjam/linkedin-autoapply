if (window.linkedInAutoApplyLoaded) {
    console.log("🔄 LinkedIn Auto Apply script already loaded, skipping...");
} else {
    window.linkedInAutoApplyLoaded = true;

    console.log("🔵 LinkedIn Auto Apply script loaded.");

    const delay = (ms) => new Promise(res => setTimeout(res, ms + Math.random() * 1000));

    // Configuration object - customize these values
    const config = {
        maxApplications: 20,
        defaultAnswers: {
            text: "N/A",
            number: "3",
            phone: "1234567890",
            years: "3",
            salary: "90000",
            yesNo: "Yes"
        },
        // Add keywords to avoid certain job titles
        blacklistKeywords: ["senior", "manager", "director", "lead", "principal"],
        // Required experience level
        experienceLevels: ["internship", "entry level", "associate"]
    };

    async function waitForElement(selector, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const element = document.querySelector(selector);
            if (element) return element;
            await delay(500);
        }
        throw new Error(`Element ${selector} not found after ${timeout}ms`);
    }

    async function handleDropdowns() {
        const dropdowns = document.querySelectorAll('select');
        for (const dropdown of dropdowns) {
            if (!dropdown.value) {
                const options = dropdown.querySelectorAll('option');
                const validOption = Array.from(options).find(option => 
                    option.value && !option.disabled && option.value !== "Select an option"
                );
                if (validOption) {
                    dropdown.value = validOption.value;
                    dropdown.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
    }

    async function handleRadioButtons() {
        const radioGroups = document.querySelectorAll('fieldset');
        for (const group of radioGroups) {
            const uncheckedRadios = group.querySelectorAll('input[type="radio"]:not(:checked)');
            if (uncheckedRadios.length > 0) {
                const yesOption = Array.from(uncheckedRadios).find(radio => 
                    radio.value.toLowerCase().includes('yes')
                );
                if (yesOption) {
                    yesOption.click();
                    await delay(500);
                } else {
                    uncheckedRadios[0].click();
                }
            }
        }
    }

    async function fillFormFields() {
        // Handle text inputs
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="file"])');
        for (const input of inputs) {
            if (!input.value) {
                switch (input.type) {
                    case 'text':
                        input.value = config.defaultAnswers.text;
                        break;
                    case 'tel':
                        input.value = config.defaultAnswers.phone;
                        break;
                    case 'number':
                        input.value = config.defaultAnswers.number;
                        break;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                await delay(300);
            }
        }

        // Handle textareas
        const textareas = document.querySelectorAll('textarea');
        for (const textarea of textareas) {
            if (!textarea.value) {
                textarea.value = config.defaultAnswers.text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                await delay(300);
            }
        }

        await handleDropdowns();
        await handleRadioButtons();
    }

    async function handleDialog() {
        try {
            // Check for "Review your application" dialog
            const reviewButton = await waitForElement('button[aria-label="Review your application"]');
            if (reviewButton) {
                reviewButton.click();
                await delay(1000);
            }

            // Handle any confirmation dialogs
            const confirmButton = await waitForElement('button[aria-label="Submit application"]');
            if (confirmButton) {
                confirmButton.click();
                return true;
            }
        } catch (error) {
            console.log("❌ Dialog handling error:", error.message);
            return false;
        }
    }

    async function isJobSuitable(job) {
        const title = job.innerText.toLowerCase();
        
        // Check blacklisted keywords
        if (config.blacklistKeywords.some(keyword => title.includes(keyword))) {
            console.log("⛔ Skipping blacklisted job:", title);
            return false;
        }

        // Check experience level
        const experienceLevel = document.querySelector('.job-details-jobs-unified-top-card__job-insight')?.innerText.toLowerCase();
        if (experienceLevel && !config.experienceLevels.some(level => experienceLevel.includes(level))) {
            console.log("⛔ Skipping job due to experience level:", experienceLevel);
            return false;
        }

        return true;
    }

    async function applyToJobs() {
        console.log("🚀 Starting LinkedIn Auto Apply...");
        
        let jobsApplied = 0;
        let jobsSkipped = 0;

        while (jobsApplied < config.maxApplications) {
            const jobCards = document.querySelectorAll(".job-card-container:not([data-processed])");
            if (!jobCards.length) {
                console.log("👀 No more jobs found on this page");
                break;
            }

            for (const job of jobCards) {
                try {
                    if (!await isJobSuitable(job)) {
                        job.setAttribute('data-processed', 'true');
                        jobsSkipped++;
                        continue;
                    }

                    job.click();
                    console.log("🖱️ Clicked on job card");
                    await delay(2000);

                    const easyApplyBtn = await waitForElement("button.jobs-apply-button");
                    if (!easyApplyBtn) {
                        console.log("⏩ No Easy Apply button found");
                        job.setAttribute('data-processed', 'true');
                        jobsSkipped++;
                        continue;
                    }

                    easyApplyBtn.click();
                    console.log("🖱️ Clicked Easy Apply button");
                    await delay(1500);

                    let currentPage = 1;
                    let hasNextPage = true;

                    while (hasNextPage && currentPage <= 10) {
                        await fillFormFields();
                        await delay(1000);

                        const nextButton = document.querySelector('button[aria-label="Continue to next step"]');
                        const submitButton = document.querySelector('button[aria-label="Submit application"]');
                        const reviewButton = document.querySelector('button[aria-label="Review your application"]');

                        if (submitButton) {
                            const submitted = await handleDialog();
                            if (submitted) {
                                console.log(`✅ Successfully applied to job #${jobsApplied + 1}`);
                                jobsApplied++;
                            }
                            hasNextPage = false;
                        } else if (nextButton) {
                            nextButton.click();
                            console.log("🖱️ Clicked Next button");
                            currentPage++;
                            await delay(1500);
                        } else if (reviewButton) {
                            reviewButton.click();
                            console.log("🖱️ Clicked Review button");
                            await delay(1500);
                        } else {
                            console.log("⚠️ No navigation buttons found");
                            hasNextPage = false;
                        }
                    }

                    job.setAttribute('data-processed', 'true');
                    await delay(3000 + Math.random() * 2000);

                } catch (error) {
                    console.error("❌ Error processing job:", error.message);
                    job.setAttribute('data-processed', 'true');
                    jobsSkipped++;
                }
            }

            // Scroll to load more jobs
            window.scrollTo(0, document.body.scrollHeight);
            await delay(2000);
        }

        console.log(`🎉 Session completed! Applied: ${jobsApplied}, Skipped: ${jobsSkipped}`);
    }

    (async () => {
        try {
            await applyToJobs();
        } catch (error) {
            console.error("❌ Error starting automation:", error);
        }
    })();
}