const fs = require("fs");
const fetch = require("node-fetch");

const baseURL = "https://www.instagram.com/";
const baseURLFeed = "https://i.instagram.com/api/v1/feed/"
const baseURLQuery = "https://www.instagram.com/graphql/query/?query_hash=8c2a529969ee035a5063f2fc8602a0fd&variables=";

const postRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([^\/?#&]+)).*/,
    highlightRegex = /https?:\/\/(?:www\.)?instagram\.com\/stories\/highlights\/(.*?)\//,
    profileRegex = /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am|instagr.com)\/(\w+)/igm;

module.exports.ProfileHooker = async (settings = { username: "", cookie: "", timeout: 50, output: "" }) => {
    const options = {
        username: settings.username,
        cookie: `sessionid=${settings.cookie};`,
        timeout: settings.timeout ? settings.timeout : 50,
        output: settings.output || "instahooker-out"
    }

    const posts = [];

    fetch(`${baseURL}${options.username.startsWith(baseURL) ? profileRegex.exec(options.username)[1] : options.username}/?__a=1`, { headers: { cookie: options.cookie } }).then(async response => {
        const data = await response.json();

        if (!data.graphql) return logger("warn", "User not found!");

        const id = data.graphql.user.id,
            fetchedData = await fetch(`${baseURLQuery}{"id":"${id}","first":"5000"}`, { headers: { cookie: options.cookie } }).then(res => res.json()),
            mediaCount = fetchedData.data.user.edge_owner_to_timeline_media.count;

        if (!mediaCount)
            return logger("warn", "There are no posts on the account you entered!");

        let after = fetchedData.data.user.edge_owner_to_timeline_media.page_info.end_cursor;

        getData(fetchedData, posts);

        await logger("fetchReady");

        process.stdout.write(`\rREADY: Fetcing data from instagram... PROGRESS: ${mediaCount > 50 ? 50 : mediaCount}/${mediaCount} (${posts.length} media)`);


        if (mediaCount > 50) {
            for (let i = 0; i < Math.floor(mediaCount / 50); i++) {

                const fetchingMediaFor = await fetch(`${baseURLQuery}{"id":"${id}","first":"5000","after":"${after}"}`, { headers: { cookie: options.cookie } })
                    .then(x => x.json());

                getData(fetchingMediaFor, posts);

                process.stdout.write(`\rREADY: Fetcing data from instagram... PROGRESS: ${i + 1 >= Math.floor(mediaCount / 50) ? mediaCount : (i + 2) * 50}/${mediaCount} (${posts.length} media)`);

                after = fetchingMediaFor.data.user.edge_owner_to_timeline_media.page_info.end_cursor;
            }
        }

        //Check the posts array
        if (!posts.length && data.graphql.user.is_private)
            return logger("warn", "The account you want to reach is private and you don't follow it, so media cannot be downloaded!");

        //Show info for download (when i use logger func its broken)
        await sleep(500);
        console.log("\nREADY: All contents have been fetched, preparing to download.");
        await sleep(500);
        console.log("READY: Download Starting...");
        await sleep(800);
        await getRemoteFile(posts, `./${options.output}/`, options.timeout);
    })
}


module.exports.PostHooker = async (settings = { url: "", cookie: "", timeout: 50, output: "" }) => {
    const options = {
        url: settings.url,
        cookie: `sessionid=${settings.cookie};`,
        timeout: settings.timeout ? settings.timeout : 50,
        output: settings.output || "instahooker-out"
    }

    const posts = [];

    const data = await fetch(`${baseURL}/p/${options.url.startsWith(baseURL) ? postRegex.exec(options.url)[3] : options.url}/?__a=1`, { headers: { cookie: options.cookie } })
        .then(res => res.json());

    getData(data, posts, "post");

    //Check the posts array
    if (!posts.length && data.items[0].user.is_private)
        return logger("warn", "The account you want to reach is private and you don't follow it, so media cannot be downloaded!");

    //Show info for download
    await logger("ready");
    await getRemoteFile(posts, `./${options.output}/`, options.timeout);

}


module.exports.StoryHooker = async (settings = { username: "", cookie: "", timeout: 50, output: "", highlight: false }) => {

    const options = {
        username: settings.username,
        cookie: `sessionid=${settings.cookie};`,
        timeout: settings.timeout ? settings.timeout : 50,
        output: settings.output || "instahookerStory-out",
        highlight: settings.highlight || false
    }

    const posts = [];

    const headers = {
        headers: {
            cookie: options.cookie,
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 105.0.0.11.118 (iPhone11,8; iOS 12_3_1; en_US; en-US; scale=2.00; 828x1792; 165586599)'
        }
    }

    if (options.highlight) {

        //Checking if its highlight
        if (!options.username.startsWith("https://www.instagram.com/stories/highlights/")) return logger("warn", "Use '--story' flag for fetching stories!")

        await logger("fetchReady");

        const hightlight = await fetch(`${baseURLFeed}reels_media/?reel_ids=highlight:${options.username.startsWith("https://www.instagram.com/stories/highlights/") ? highlightRegex.exec(options.username)[1] : options.username}`, headers);

        const highlightStories = await hightlight.json();

        getData(Object.values(highlightStories.reels)[0], posts, "story");

        //Checking array for story is exits
        if (!posts.length)
            return logger("warn", "The account you want to reach is private or there are no highlight on the url you entered, so media cannot be downloaded!");

        //Show info for download
        await logger("ready");
        return await getRemoteFile(posts, `./${options.output}/`, options.timeout);

    } else {

        //Checking if its highlight
        if (options.username.startsWith("https://www.instagram.com/stories/highlights/")) return logger("warn", "Use '--highlights' flag for fetching highlights!")

        await fetch(`${baseURL}${options.username.startsWith(baseURL) ? profileRegex.exec(options.username)[1] : options.username}/?__a=1`, { headers: { cookie: options.cookie } }).then(async response => {
            const data = await response.json();
            if (!data.graphql) return logger("warn", "User not found!")

            const id = data.graphql.user.id;

            await fetch(`${baseURLFeed}reels_tray/`, headers).then(x => x.json()).then(async () => {

                await logger("fetchReady");

                const stories = await fetch(`${baseURLFeed}user/${id}/reel_media/`, headers).then(res => res.json());

                getData(stories, posts, "story");

                //Checking array for story is exits
                if (!posts.length) {
                    if (data.graphql.user.is_private) {
                        return logger("warn", "The account you want to reach is private and you don't follow it, so media cannot be downloaded!");
                    }
                    return logger("warn", "There are no stories on the account you entered!")
                }

                //Show info for download
                await logger("ready");
                return await getRemoteFile(posts, `./${options.output}/`, options.timeout);
            })
        });
    }
}


async function getRemoteFile(PostArray, output, ms) {
    if (!fs.existsSync(output)) {
        fs.mkdirSync(output, {
            recursive: true
        });
    }

    let i = 0;

    //i am not using forEach cuz sleep function is not working when i use forEach :(
    for (const x of PostArray.filter(x => x.url.startsWith("https://instagram"))) {
        await fetch(x.url).then(res => res.buffer()).then(async image => {

            fs.writeFileSync(output + x.name, image, (error) => { console.log(error) });
            process.stdout.write(`\rINFO: Media "${x.name}" downloaded. PROGRESS: (${i + 1}/${PostArray.length})`);

        });

        await sleep(ms);
        i++;

        if (i === PostArray.length) {
            return console.log(`\nCOMPLATE: Download finished! Statics: Video Count: ${PostArray.filter(x => x.name.endsWith(".mp4")).length} - Photo Count: ${PostArray.filter(x => x.name.endsWith(".png")).length}`)
                , console.log("> InstaHooker CLI - By Bilal Taner (shynox)\n> Type -h for help menu");
        };
    }
}

function getData(fetch, posts, type) {

    switch (type) {
        case "story":
            fetch.items.forEach((x) => {
                switch (x.media_type) {
                    case 1:
                        posts.push({ name: `instaHookerStory_${x.pk}.png`, url: x.image_versions2.candidates[0].url });
                        break;
                    case 2:
                        posts.push({ name: `instaHookerStory_${x.pk}.mp4`, url: x.video_versions[0].url });
                        break;
                }
            });
            break;

        case "post":
            const node = fetch.items[0];
            if (node.carousel_media) {
                let i = 0;
                node.carousel_media.forEach(sidecar => {
                    if (sidecar.media_type === 2) {
                        posts.push({ name: `instaHooker_${sidecar.code}_${i}_${node.pk}.mp4`, url: sidecar.video_versions[0].url });
                    } else {
                        posts.push({ name: `instaHooker_${sidecar.code}_${i}_${node.pk}.png`, url: sidecar.image_versions2.candidates[0].url });
                    }
                    i++;
                })
                break;
            } else {
                if (node.video_versions) {
                    console.log(node)
                    posts.push({ name: `instaHooker_${node.code}_0_${node.pk}.mp4`, url: node.video_versions[0].url });
                } else if (node.image_versions2.candidates[0]) {
                    console.log(node)
                    posts.push({ name: `instaHooker_${node.code}_0_${node.pk}.png`, url: node.image_versions2.candidates[0].url });
                }
            }
            break;

        default:
            fetch.data.user.edge_owner_to_timeline_media.edges.forEach(x => {
                const node = x.node;
                if (!node.__typename) return;

                switch (node.__typename) {
                    case "GraphSidecar":
                        let i = 0;
                        node.edge_sidecar_to_children.edges.forEach(sidecar => {
                            if (sidecar.node.video_url) {
                                posts.push({ name: `instaHooker_${node.shortcode}_${i}_${node.id}.mp4`, url: sidecar.node.video_url });
                            } else {
                                posts.push({ name: `instaHooker_${node.shortcode}_${i}_${node.id}.png`, url: sidecar.node.display_url });
                            }
                            i++;
                        })
                        break;

                    case "GraphVideo":
                        posts.push({ name: `instaHooker_${node.shortcode}_0_${node.id}.mp4`, url: node.video_url });
                        break;

                    case "GraphImage":
                        if (!node.edge_sidecar_to_children)
                            posts.push({ name: `instaHooker_${node.shortcode}_0_${node.id}.png`, url: node.display_url });


                }
            })
    }
}

async function logger(type, message) {
    switch (type) {
        case "warn":
            console.log(`WARN: ${message}`);
            break;
        case "ready":
            await sleep(500);
            console.log("READY: All contents have been fetched, preparing to download.");
            await sleep(500);
            console.log("READY: Download Starting...");
            await sleep(800);
            break;
        case "fetchReady":
            console.log("READY: Contents are starting to fetch...");
            await sleep(300);
            break;
    }
}

async function sleep(second) {
    await new Promise((resolve) => setTimeout(resolve, second));
}

process.on("unhandledRejection", (error) => {
    return console.log("ERROR: Something went wrong " + error);
});
