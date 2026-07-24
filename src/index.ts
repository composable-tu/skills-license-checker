import { defineCommand, runMain } from "citty";

const main = defineCommand({
    meta: {
        name: "skills-license-checker",
        description: "Skills License Checker",
    },
})


runMain(main);