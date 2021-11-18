const fs = require("fs");
const fetch = require("node-fetch");

const baseURL = `https://www.instagram.com/`;
const baseURLQuery = `https://www.instagram.com/graphql/query/?query_hash=8c2a529969ee035a5063f2fc8602a0fd&variables=`;

const postRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([^\/?#&]+)).*/;
const profileRegex = /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am|instagr.com)\/(\w+)/igm;

module.exports.ProfileHooker = async (setting = { username: "", cookie: "", timeout: 50, output: "" }) => {
    const options = {
        username: setting.username,
        cookie: `sessionid=${setting.cookie};`,
        timeout: setting.timeout ? setting.timeout : 50,
        output: setting.output || "instahooker-out"
    }

    const posts = [];

    fetch(`${baseURL}${options.username.startsWith(baseURL) ? profileRegex.exec(options.username)[1] : options.username}/?__a=1`, { headers: { cookie: options.cookie } }).then(async response => {
        const data = await response.json();
        if (!data.graphql) return console.log("WARN: User not found!");

        const id = data.graphql.user.id,
            fetchedData = await fetch(`${baseURLQuery}{"id":"${id}","first":"5000"}`, { headers: { cookie: options.cookie } }).then(res => res.json()),
            mediaCount = fetchedData.data.user.edge_owner_to_timeline_media.count;

        if (!mediaCount) return console.log("WARN: There are no posts on the account you entered!");

        let after = fetchedData.data.user.edge_owner_to_timeline_media.page_info.end_cursor;

        getData(fetchedData, posts);

        console.log("READY: Posts are starting to fetch...");
        await sleep(500);
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
        if (!posts.length && data.graphql.user.is_private) return console.log("WARN: The account you want to reach is private and you don't follow it, so media cannot be downloaded!");

        //Show info for download
        await sleep(800);
        console.log("\nREADY: All posts have been fetched, preparing to download.");
        await sleep(800);
        console.log("READY: Download Starting...");
        await sleep(1300);
        await getRemoteFile(posts, `./${options.output}/`, options.timeout);
    })
}


module.exports.PostHooker = async (setting = { url: "", cookie: "", timeout: 50, output: "" }) => {
    const options = {
        url: setting.url,
        cookie: `sessionid=${setting.cookie};`,
        timeout: setting.timeout ? setting.timeout : 50,
        output: setting.output || "instahooker-out"
    }

    const posts = [];

    const data = await fetch(`${baseURL}/p/${options.url.startsWith(baseURL) ? postRegex.exec(options.url)[3] : options.url}/?__a=1`, { headers: { cookie: options.cookie } })
        .then(res => res.json());

    getData(data, posts, "post");

    //Check the posts array
    if (!posts.length && data.graphql.user.is_private) return console.log("WARN: The account you want to reach is private and you don't follow it, so media cannot be downloaded!");

    //Show info for download
    await sleep(300);
    console.log("READY: All contents have been fetched, preparing to download.");
    await sleep(300);
    console.log("READY: Download Starting...");
    await sleep(800);
    await getRemoteFile(posts, `./${options.output}/`, options.timeout);

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
            return console.log(`\nCOMPLETE: Download finished! Statics: Video Count: ${PostArray.filter(x => x.name.endsWith(".mp4")).length} - Photo Count: ${PostArray.filter(x => x.name.endsWith(".png")).length}`)
                , console.log("> InstaHooker CLI - By Bilal Taner (shynox)\n> Thanks to Tuhana (tuhana) for helping cli\n> Type -h for help menu");
        };
    }
}

function getData(fetch, posts, type) {

    switch (type) {
        case "post":
            const node = fetch.graphql.shortcode_media;
            switch (fetch.graphql.shortcode_media.__typename) {
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

async function sleep(second) {
    await new Promise((resolve) => setTimeout(resolve, second));
}

process.on("unhandledRejection", (error) => {
    return console.log("ERROR: Something went wrong " + error);
});
