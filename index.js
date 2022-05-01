const fs = require("fs");
const fetch = require("node-fetch");
const baseURL = "https://www.instagram.com/",
    baseURLFeed = "https://i.instagram.com/api/v1/feed/",
    baseURLQuery = "https://www.instagram.com/graphql/query/?query_hash=8c2a529969ee035a5063f2fc8602a0fd&variables=",
    posts = [];

const postRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([^\/?#&]+)).*/,
    highlightRegex = /https?:\/\/(?:www\.)?instagram\.com\/stories\/highlights\/(.*?)\//,
    storyRegex = /https?:\/\/(?:www\.)?instagram\.com\/stories\/(.*?)\//,
    profileRegex = /(?<=instagram.com\/)[A-Za-z0-9_.]+/igm;

class InstagramDumper {

    /**
     * 
     * @param {{ input: string, cookie: string, timeout: number, output: string }} config 
     */
    constructor (config) {
        this.input = config.input;
        this.cookie = config.cookie;
        this.timeout = config.timeout;
        this.output = config.output;
        this.index = Number(config.index);
    }

    /**
     * 
     * @param {string} cookie 
     */
    getHeader() {
        return {
            "cookie": `sessionid=${this.cookie};`,
            "user-agent": 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 105.0.0.11.118 (iPhone11,8; iOS 12_3_1; en_US; en-US; scale=2.00; 828x1792; 165586599)'
        }
    }

    /**
     * 
     * @param {number} second 
     */
    async sleep(second) {
        await new Promise((resolve) => setTimeout(resolve, second));
    }

    /**
     * 
     * @param {{string: "ready" | "downloadStart" | "downloadFinish" | "warnMediaNotFound" | "warnContentNotFound" | "warnUserNotFound" | "warnPrivateAcc"}} type 
     * @param {any[]} ImageArray 
     */
    async log(type, time) {

        switch (type) {
            case "fetchReady":
                console.log("🔘 READY: Contents are starting to fetch...");
                if (time) await this.sleep(time);
                break;
            case "ready":
                console.log("🔘 READY: All contents have been fetched, preparing to download.");
                if (time) await this.sleep(time);
                break;
            case "readyForProfile":
                console.log("\n🔘 READY: All contents have been fetched, preparing to download.");
                if (time) await this.sleep(time);
                break;
            case "downloadStart":
                console.log("🔘 READY: Download Starting...");
                if (time) await this.sleep(time);
                break;
            case "warnMediaNotFound":
                console.log("❌ The account you want to reach is private and you don't follow it, so media cannot be downloaded!");
                if (time) await this.sleep(time);
                break;
            case "warnContentNotFound":
                console.log("❌ There are no stories/photos/videos/reels on the account you entered!");
                if (time) await this.sleep(time);
                break;
            case "warnUserNotFound":
                console.log("❌ User not found!");
                if (time) await this.sleep(time);
                break;
            case "warnPrivateAcc":
                console.log("❌ The account you want to reach is private and you don't follow it, so media cannot be downloaded!");
                if (time) await this.sleep(time);
                break;

        }
    }


    /**
     * 
     * @param {any[]} ImageArray 
     * @param {string} output 
     * @param {number} ms 
     */
    async getRemoteFile(ImageArray, output, ms) {
        if (!fs.existsSync(output)) {
            fs.mkdirSync(output, {
                recursive: true
            });
        }

        let i = 0;

        let mainArray = (this.index && this.index > 0 && ImageArray.length >= this.index ? [ImageArray[this.index - 1]] : ImageArray)

        for (const x of mainArray.filter(x => x.url.startsWith("https://instagram"))) {
            await fetch(x.url).then(res => res.buffer()).then(async image => {
                fs.writeFileSync(output + x.name, image, (error) => { console.log(error) });
                process.stdout.write(`\r➕ INFO: Media "${x.name}" downloaded. PROGRESS: [ ${i + 1}/${mainArray.length} ]`);
            });

            await this.sleep(ms);
            i++;

            if (i === mainArray.length) {
                return console.log(`\n👌 COMPLATE: Download finished! Statics: Video Count: [ ${mainArray.filter(x => x.name.endsWith(".mp4")).length} ] - Photo Count: [ ${mainArray.filter(x => x.name.endsWith(".png")).length} ]`),
                    console.log("> InstaHooker CLI - By Bilal Taner (shynox)\n> Type -h for help menu");
            };
        }
    }

    /**
     * 
     * @param {any} fetch 
     * @param {any[]} posts 
     * @param {{string: "story" | "post"}} type 
     */
    getData(fetch, posts, type) {
        switch (type) {
            case "story":
                fetch.items.forEach((x) => {
                    switch (x.media_type) {
                        case 1:
                            posts.push({ name: `instaHookerStory_${x.pk}.png`, url: x.image_versions2.candidates[0].url, code: x.pk });
                            break;
                        case 2:
                            posts.push({ name: `instaHookerStory_${x.pk}.mp4`, url: x.video_versions[0].url, code: x.pk });
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
                            posts.push({ name: `instaHooker_${node.code}_${i}_${node.pk}.mp4`, url: sidecar.video_versions[0].url, code: node.code });
                        } else {
                            posts.push({ name: `instaHooker_${node.code}_${i}_${node.pk}.png`, url: sidecar.image_versions2.candidates[0].url, code: node.code });
                        }
                        i++;
                    })
                    break;
                } else {
                    if (node.video_versions) {
                        posts.push({ name: `instaHooker_${node.code}_0_${node.pk}.mp4`, url: node.video_versions[0].url, code: node.code });
                    } else if (node.image_versions2.candidates[0]) {
                        posts.push({ name: `instaHooker_${node.code}_0_${node.pk}.png`, url: node.image_versions2.candidates[0].url, code: node.code });
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
                                    posts.push({ name: `instaHooker_${node.shortcode}_${i}_${node.id}.mp4`, url: sidecar.node.video_url, code: node.shortcode });
                                } else {
                                    posts.push({ name: `instaHooker_${node.shortcode}_${i}_${node.id}.png`, url: sidecar.node.display_url, code: node.shortcode });
                                }
                                i++;
                            })
                            break;

                        case "GraphVideo":
                            posts.push({ name: `instaHooker_${node.shortcode}_0_${node.id}.mp4`, url: node.video_url, code: node.shortcode });
                            break;

                        case "GraphImage":
                            if (!node.edge_sidecar_to_children)
                                posts.push({ name: `instaHooker_${node.shortcode}_0_${node.id}.png`, url: node.display_url, code: node.shortcode });
                    }
                })
        }
    }

    async ProfileDumper() {
        await fetch(`${baseURL}${this.input.startsWith(baseURL) ? profileRegex.exec(this.input)[0] : this.input}/?__a=1`, { headers: this.getHeader() }).then(async response => {
            const data = await response.json();

            if (!data.graphql) return await this.log("warnUserNotFound");


            const id = data.graphql.user.id,
                fetchedData = await fetch(`${baseURLQuery}{"id":"${id}","first":"5000"}`, { headers: this.getHeader() }).then(res => res.json()),
                mediaCount = fetchedData.data.user.edge_owner_to_timeline_media.count;

            if (!mediaCount)
                return await this.log("warnContentNotFound");

            let after = fetchedData.data.user.edge_owner_to_timeline_media.page_info.end_cursor;

            this.getData(fetchedData, posts);

            await this.log("fetchReady", 200);

            process.stdout.write(`\r🔘 READY: Fetcing data from instagram... PROGRESS: [ ${mediaCount > 50 ? 50 : mediaCount}/${mediaCount} (${posts.length} media) ]`);

            if (mediaCount > 50) {
                for (let i = 0; i < Math.floor(mediaCount / 50); i++) {

                    await this.sleep(1500)

                    const fetchingMediaFor = await fetch(`${baseURLQuery}{"id":"${id}","first":"5000","after":"${after}"}`, { headers: this.getHeader() })
                        .then(x => x.json());

                    this.getData(fetchingMediaFor, posts);

                    process.stdout.write(`\r🔘 READY: Fetcing data from instagram... PROGRESS: [ ${i + 1 >= Math.floor(mediaCount / 50) ? mediaCount : (i + 2) * 50}/${mediaCount} (${posts.length} media) ]`);

                    after = fetchingMediaFor.data.user.edge_owner_to_timeline_media.page_info.end_cursor;
                }
            }

            //Check the posts array
            if (!posts.length && data.graphql.user.is_private)
                return await this.log("warnPrivateAcc");

            //Show info for download (when i use logger func its broken)
            await this.log("readyForProfile", 200)
            await this.log("downloadStart", 200)
            await this.getRemoteFile(posts, `./${this.output || data.graphql.user.username}/instahooker-profile/`, this.timeout);
        })
    }

    /**
     * 
     * @param {boolean} isHighlight 
     */
    async StoryHighlightDumper(isHighlight) {


        if (isHighlight || this.input.startsWith("https://www.instagram.com/stories/highlights/")) {

            await this.log("fetchReady", 200);

            const highlightStories = await fetch(`${baseURLFeed}reels_media/?reel_ids=highlight:${this.input.startsWith("https://www.instagram.com/stories/highlights/") ? highlightRegex.exec(this.input)[1] : this.input}`, { headers: this.getHeader() }).then(res => res.json());

            this.getData(Object.values(highlightStories.reels)[0], posts, "story");

            //Checking array for story is exits
            if (!posts.length)
                return this.log("warnPrivateAcc");

            //Show info for download
            await this.log("ready", 200);
            await this.log("downloadStart", 200)
            return await this.getRemoteFile(posts, `./${this.output || Object.values(highlightStories.reels)[0].user.username}/instahooker-highlight/`, this.timeout);

        } else {

            await fetch(`${baseURL}${this.input.startsWith("https://www.instagram.com/stories/") ? storyRegex.exec(this.input)[1] : this.input.startsWith(baseURL) ? profileRegex.exec(this.input)[0] : this.input}/?__a=1`, { headers: this.getHeader() }).then(async response => {
                const data = await response.json();
                if (!data.graphql) return this.log("warnUserNotFound");

                const id = data.graphql.user.id;

                await fetch(`${baseURLFeed}reels_tray/`, { headers: this.getHeader() }).then(async () => {

                    await this.log("fetchReady", 100);

                    const stories = await fetch(`${baseURLFeed}user/${id}/reel_media/`, { headers: this.getHeader() }).then(res => res.json());

                    this.getData(stories, posts, "story");

                    //Checking array for story is exits
                    if (!posts.length) {
                        if (data.graphql.user.is_private) {
                            return this.log("warnPrivateAcc");
                        }
                        return this.logger(warnContentNotFound)
                    }

                    //Show info for download
                    await this.log("ready", 200);
                    await this.log("downloadStart", 200)
                    return await this.getRemoteFile(posts, `./${this.output || data.graphql.user.username}/instahooker-story/`, this.timeout);
                })
            });
        }
    }

    async PostDumper() {
        await this.log("fetchReady", 200);

        const data = await fetch(`${baseURL}/p/${this.input.startsWith(baseURL) ? postRegex.exec(this.input)[3] : this.input}/?__a=1`, { headers: this.getHeader() })
            .then(res => res.json());

        this.getData(data, posts, "post");

        //Check the posts array
        if (!posts.length && data.items[0].user.is_private)
            return this.log("warnPrivateAcc");

        //Show info for download
        await this.log("ready", 200);
        await this.log("downloadStart", 200)
        await this.getRemoteFile(posts, `./${this.output || data.items[0].user.username}/instahooker-posts/`, this.timeout);
    }

}

process.on("unhandledRejection", () => {
    return console.log("❌ ERROR: Something went wrong. Please recheck the values you entered! (Suggestion: Check your cookie first.)");
});

module.exports = InstagramDumper;
