const { spawn } = require("child_process");
const fs = require("fs/promises");

const parseEnvFile = (envData) => {
  return envData.split("\n").reduce((prev, line) => {
    const [key, value] = line.split("=");
    prev[key] = value;
    return prev;
  }, {});
};

const runCommand = async (command, args) => {
  const subprocess = spawn(command, args);
  let output = "";

  for await (const data of subprocess.stdout) {
    output += data.toString();
  }

  let error = "";
  for await (const data of subprocess.stderr) {
    error += data.toString();
  }

  const exitCode = await new Promise((resolve) => {
    subprocess.on("close", resolve);
  });

  if (exitCode !== 0) {
    throw new Error(
      `Command '${command} ${args.join(
        " "
      )}' exited with code ${exitCode}. ${error}`
    );
  }

  return output;
};

const compareEnvironments = (localEnvVars, netlifyEnvVars) => {
  const diffLocalEnvVars = {};
  const diffNetlifyEnvVars = {};

  Object.keys(localEnvVars).forEach((key) => {
    if (localEnvVars[key] !== netlifyEnvVars[key]) {
      diffLocalEnvVars[key] = localEnvVars[key];
    }
  });

  Object.keys(netlifyEnvVars).forEach((key) => {
    if (localEnvVars[key] !== netlifyEnvVars[key]) {
      diffNetlifyEnvVars[key] = netlifyEnvVars[key];
    }
  });

  Object.keys(localEnvVars).forEach((key) => {
    if (
      localEnvVars[key] &&
      netlifyEnvVars[key] &&
      localEnvVars[key] !== netlifyEnvVars[key]
    ) {
      diffLocalEnvVars[key] = localEnvVars[key];
      diffNetlifyEnvVars[key] = netlifyEnvVars[key];
    }
  });

  Object.keys(diffLocalEnvVars).forEach((key) => {
    if (diffNetlifyEnvVars[key]) {
      console.log(`! ${key}=${diffLocalEnvVars[key]}`);
      console.log(`! ${key}=${diffNetlifyEnvVars[key]}`);
    } else {
      console.log(`+ ${key}=${diffLocalEnvVars[key]}`);
    }
  });

  Object.keys(diffNetlifyEnvVars).forEach((key) => {
    if (!diffLocalEnvVars[key]) {
      console.log(`- ${key}=${diffNetlifyEnvVars[key]}`);
    }
  });

  if (
    Object.keys(diffLocalEnvVars).length === 0 &&
    Object.keys(diffNetlifyEnvVars).length === 0
  ) {
    console.log("No differences found.");
  }
};

module.exports = async function main(args) {
  // 引数をパースする
  const [, , siteName, configPath] = args;

  // 引数のバリデーション
  if (!siteName || !configPath) {
    console.error("Usage: netlify-env-dry-runner <site-name> <config-path>");
    return;
  }
  await runCommand("yarn", ["run", "netlify", "link", "--name", siteName]);
  const netlifyEnvVarsOutput = await runCommand("yarn", [
    "run",
    "netlify",
    "env:list",
    "--json",
  ]);

  let netlifyEnvVars;

  const jsonStartIndex = netlifyEnvVarsOutput.indexOf("{");
  const jsonEndIndex = netlifyEnvVarsOutput.lastIndexOf("}");
  const jsonString = netlifyEnvVarsOutput.substring(
    jsonStartIndex,
    jsonEndIndex + 1
  );
  netlifyEnvVars = JSON.parse(jsonString);

  let localEnvVarsData;
  try {
    localEnvVarsData = await fs.readFile(configPath, "utf-8");
  } catch (error) {
    console.error(`Failed to read file: ${configPath}`);
    throw Error(error);
  }

  let localEnvVars;

  try {
    localEnvVars = parseEnvFile(localEnvVarsData);
  } catch (error) {
    console.error(`Wrong format : ${configPath}`);
    console.error(error);
  }

  compareEnvironments(localEnvVars, netlifyEnvVars);
  await runCommand("yarn", ["run", "netlify", "unlink"]);
};
