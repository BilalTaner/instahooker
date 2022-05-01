const { Command } = require("commander"),
    program = new Command();

const InstagramDumper = require("./index");

program
    .version(require("./package.json").version)
    .option("-p, --post <url | shortcode>", "URL or Shortcode of the targetted post (reel, image, video)")
    .option("-hl, --highlights <url | shortcode>", "URL or Shortcode of the targetted hightlights")
    .option("-st, --story <username>", "Username or url of the targetted instagram user for fetching stories")
    .option("-u, --username <username>", "Username or url of the targetted instagram user")
    .option("-s, --sid <session_id> (required)", "Session id of the user")
    .option("-o, --output <folder>", "Output directory for downloading the media [default: 'instahooker-out'/'instahookerStory-out']")
    .option("-t, --timeout <timeout (millisecond)>", "Download time of files [default: 50 millisecond (recommended)]")
    .option("-i, --index <indexOfArray>", "Downloads only the selected file otherwise downloads all files.")
    .addHelpText("afterAll", "Example: InstaHooker.exe -u someone -s myCoolSessionID -o myFolder")
    .addHelpText("afterAll", "Example for Posts: InstaHooker.exe -p postURL/shortcode -s myCoolSessionID -o myFolder")
    .addHelpText("afterAll", "Example for Story: InstaHooker.exe -st postURL/shortcode -s myCoolSessionID -o myFolder")
    .addHelpText("afterAll", "Example for Highlight: InstaHooker.exe -hl postURL/shortcode -s myCoolSessionID -o myFolder")
    .parse(process.argv);

(async () => {

    const options = program.opts();

    //advertisement
    console.log("> InstaHooker CLI - By Bilal Taner (shynox)\n> Type -h for help menu");

    if (!(options.username || options.post || options.highlights || options.story))
        return console.log("❌ You must enter a input for hooking images! [ -s || --sid <session_id> ]")

    if (!options.sid)
        return console.log("❌ You must enter a sessionid for hooking images! [ -s || --sid <session_id> ]")

    const newApp = new InstagramDumper({ input: options.username || options.post || options.highlights || options.story, cookie: options.sid, timeout: options?.timeout || 50, output: options?.output, index: options.username ? null : options?.index })

    if (options.post && !options.username) {
        return await newApp.PostDumper();
    } else if (options.username && !options.post) {
        return await newApp.ProfileDumper();
    } else if (options.highlights || options.story) {
        return await newApp.StoryHighlightDumper(options.highlights ? true : false)
    }
})();