const { Command } = require("commander"),
    program = new Command(),
    { startHook } = require("./index.js")

program
    .version(require("./package.json").version)
    .option("-u, --username <username>", "Username of the targetted instagram user")
    .option("-s, --sid <session_id>", "Session id of the user. Required when hooking private accounts")
    .option("-o, --output <folder>", "Output directory for downloading the media [default: 'instahooker-out']")
    .option("-t, --timeout <timeout (millisecond)>", "Download time of files [default: 100 millisecond (recommended)]")
    .addHelpText("afterAll", "Example: InstaHooker.exe -u someone -s myCoolSessionID -o myFolder")
    .parse(process.argv);

(async () => {
    const options = program.opts();

    //advertisement
    console.log("> InstaHooker CLI - By Bilal Taner (shynox)\n> Thanks to Tuhana (tuhana) for helping cli\n> Type -h for help menu");

    if (!options.username)
        return console.log("You must enter a username!")
    else if (!options.sid)
        return console.log("You must enter a sessionid for hooking images!")
    else {
        await startHook({ username: options.username, cookie: options.sid, timeout: options?.timeout, output: options?.output })
    }
})();
