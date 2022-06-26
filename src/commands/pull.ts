import { Command } from "commander";
import { diff } from "../lib/diff";
import { readFiles } from "../lib/readFiles";
import { getGlobalOptions } from "../util/options";
import { apiPull as apiPull } from "../lib/api";
import inquirer from "inquirer";
import chalk from "chalk";
import { printDiff } from "../util/print";
import { writeFiles } from "../lib/writeFiles";
import { log } from "../util/logger";
import mergeDeep from "merge-deep";
import { PullOptions } from "../../types";

interface CommandOptions extends PullOptions {
  yes?: boolean;
}

const pull = async (
  { yes, ...cliPullOpts }: CommandOptions,
  program: Command
) => {
  const options = await getGlobalOptions(program);
  const {
    accessKey,
    localesDir,
    namespaces,
    pull: pullOptions,
  } = mergeDeep(options, { pull: cliPullOpts });
  const local = await readFiles(localesDir, namespaces);
  const remote = await apiPull(accessKey, pullOptions);

  const { added, updated, deleted, totalCount } = diff(local, remote);
  if (!totalCount) {
    log.success("Everything up to date!");
    process.exit(0);
  }

  if (!yes) {
    log.log(`
Pulling will have the following effect:
${printDiff({ added, updated, deleted })}
    `);
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Continue?",
      },
    ]);

    if (!confirm) {
      log.error("Nothing pulled");
      process.exit(0);
    }
  }

  writeFiles(remote, options);
  log.success(`Wrote files to ${chalk.bold(localesDir)}.`);
  process.exit(0);
};

export default pull;
