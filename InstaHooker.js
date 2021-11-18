const { Command } = require("commander"),
    program = new Command(),
    { PostHooker, ProfileHooker } = require("./index.js")

program
    .version(require("./package.json").version)
    .option("-p, --post <url | shortcode>", "URL or Shortcode of the targetted post (reel, image, video)")
    .option("-u, --username <username>", "Username of the targetted instagram user")
    .option("-s, --sid <session_id> (required)", "Session id of the user")
    .option("-o, --output <folder>", "Output directory for downloading the media [default: 'instahooker-out']")
    .option("-t, --timeout <timeout (millisecond)>", "Download time of files [default: 50 millisecond (recommended)]")
    .addHelpText("afterAll", "Example: InstaHooker.exe -u someone -s myCoolSessionID -o myFolder")
    .addHelpText("afterAll", "Example for Posts: InstaHooker.exe -p postURL/shortcode -s myCoolSessionID -o myFolder")
    .parse(process.argv);

(async () => {
    const options = program.opts();

    //advertisement
    console.log("> InstaHooker CLI - By Bilal Taner (shynox)\n> Thanks to Tuhana (tuhana) for helping cli\n> Type -h for help menu");

    if (!options.sid)
        return console.log("You must enter a sessionid for hooking images!")

    if (options.post && !options.u) {
        return await PostHooker({ url: options.post, cookie: options.sid, timeout: options?.timeout, output: options?.output });
    }

    if (!options.username)
        return console.log("You must enter a username!");

    else {
        return await ProfileHooker({ username: options.username, cookie: options.sid, timeout: options?.timeout, output: options?.output });
    }
})();
