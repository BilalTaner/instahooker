const { Command } = require("commander"),
    program = new Command(),
    { PostHooker, ProfileHooker, StoryHooker } = require("./index.js")

program
    .version(require("./package.json").version)
    .option("-p, --post <url | shortcode>", "URL or Shortcode of the targetted post (reel, image, video)")
    .option("-hl, --highlights <url | shortcode>", "URL or Shortcode of the targetted hightlights")
    .option("-st, --story <username>", "Username or url of the targetted instagram user for fetching stories")
    .option("-u, --username <username>", "Username or url of the targetted instagram user")
    .option("-s, --sid <session_id> (required)", "Session id of the user")
    .option("-o, --output <folder>", "Output directory for downloading the media [default: 'instahooker-out'/'instahookerStory-out']")
    .option("-t, --timeout <timeout (millisecond)>", "Download time of files [default: 50 millisecond (recommended)]")
    .addHelpText("afterAll", "Example: InstaHooker.exe -u someone -s myCoolSessionID -o myFolder")
    .addHelpText("afterAll", "Example for Posts: InstaHooker.exe -p postURL/shortcode -s myCoolSessionID -o myFolder")
    .addHelpText("afterAll", "Example for Story: InstaHooker.exe -st postURL/shortcode -s myCoolSessionID -o myFolder")
    .addHelpText("afterAll", "Example for Highlight: InstaHooker.exe -hl postURL/shortcode -s myCoolSessionID -o myFolder")
    .parse(process.argv);

(async () => {
    const options = program.opts();

    //advertisement
    console.log("> InstaHooker CLI - By Bilal Taner (shynox)\n> Type -h for help menu");

    if (!options.sid)
        return console.log("You must enter a sessionid for hooking images!")

    if (options.post && !options.u) {
        return await PostHooker({ url: options.post, cookie: options.sid, timeout: options?.timeout, output: options?.output });
    }

    if (options.highlights || options.story) {
        return await StoryHooker({ username: options.highlights || options.story, cookie: options.sid, timeout: options?.timeout, output: options?.output, highlight: options.highlights })
    }

    if (!options.username)
        return console.log("You must enter a username!");

    else {
        return await ProfileHooker({ username: options.username, cookie: options.sid, timeout: options?.timeout, output: options?.output });
    }
})();
