#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("opensasa")
  .description("Local-first AI coding workflow metadata tracker.")
  .version("0.0.0")
  .showHelpAfterError();

program
  .command("log")
  .description("Record an AI coding session manually. Not implemented yet.")
  .action(() => {
    console.log("opensasa log is not implemented yet.");
  });

program
  .command("sessions")
  .description("List local AI coding sessions. Not implemented yet.")
  .action(() => {
    console.log("opensasa sessions is not implemented yet.");
  });

program
  .command("report")
  .description("Generate a local personal report. Not implemented yet.")
  .action(() => {
    console.log("opensasa report is not implemented yet.");
  });

program
  .command("inspect")
  .description("Inspect a local session or contribution preview. Not implemented yet.")
  .argument("[session-id]", "local session ID to inspect")
  .option("--contribution", "preview a sanitized contribution payload")
  .action(() => {
    console.log("opensasa inspect is not implemented yet.");
  });

program.parse();
