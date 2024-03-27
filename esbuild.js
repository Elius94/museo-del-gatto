/* eslint-disable no-useless-escape */
// esbuild.js
import { execSync } from "child_process"
import { build, context } from "esbuild"
import fs from "fs"
import figlet from "figlet"
import sharp from "sharp"
import path from "path"

const INPUT_IMAGE_PATH = "src/textures/"
const EXCLUDED_PATHS = ["src/textures/controller", "src/textures/bg"]
const outputQualityFormats = {
    "HD": {
        size: 4096,
        quality: 100,
        format: "jpg"
    },
    "MD": {
        size: 2048,
        quality: 80,
        format: "webp"
    },
    "SD": {
        size: 2048,
        quality: 60,
        format: "webp"
    },
    "LD": {
        size: 1024,
        quality: 60,
        format: "webp"
    }
}
//const INPUT_IMAGE_PATH = "src/textures/**/*.{jpg,JPG,jpeg,JPEG,png,svg,gif}"
const OUTPUT_IMAGE_PATH = "public/textures/"

function resizeImagesInDir(dirPath, outdir, quality = "HD") {
    // Get a list of files in the directory
    const files = fs.readdirSync(dirPath);

    // Loop through each file and check if it's a directory or an image
    files.forEach(file => {
        const filePath = path.join(dirPath, file);

        // If the file is a directory, call this function recursively
        if (fs.statSync(filePath).isDirectory()) {
            if (!EXCLUDED_PATHS.find(p => path.normalize(p) === path.normalize(filePath))) {
                resizeImagesInDir(filePath, path.join(outdir, file), quality)
            } else {
                console.log(`Excluding ${filePath}`)
                fs.cpSync(filePath, path.join(outdir, file), { recursive: true })
            }
        }

        // If the file is an image, resize it using sharp and overwrite the original file
        else if (/\.(jpe?g|png)$/i.test(file)) {
            sharp(filePath)
                .resize({ width: outputQualityFormats[quality].size, height: outputQualityFormats[quality].size, fit: 'inside', withoutEnlargement: true })
                .toFormat(outputQualityFormats[quality].format, { quality: outputQualityFormats[quality].quality })
                .toBuffer()
                .then(buffer => {
                    const outP = path.join(outdir, quality, file)
                    if (!fs.existsSync(path.dirname(outP))) {
                        fs.mkdirSync(path.dirname(outP), { recursive: true });
                    }
                    fs.writeFileSync(outP, buffer);
                })
                .catch(error => {
                    console.error(`Error resizing image ${filePath}: ${error}`);
                });
        }
    });
}

const pkg = JSON.parse(fs.readFileSync("./package.json"))

const watch = process.argv.includes("--watch")
const dev = process.argv.includes("--dev") || process.env.NODE_ENV === "development"
const justCode = process.argv.includes("--just-code")

let firstBuild = justCode ? false : true

if (firstBuild) {
    // rm -rf public
    fs.rmSync("public", { recursive: true, force: true })
}


const banner = "/* eslint-disable linebreak-style */\n" +
    "/*\n" +
    figlet.textSync("Eliusoutdoor Virtual Gallery", { horizontalLayout: "full", font: "Big" }) +
    "\n" +
    `                                                                                v${pkg.version}\n\n\n` +
    `   ${pkg.description}\n\n` +
    `   Author: ${pkg.author}\n` +
    `   License: ${pkg.license}\n` +
    `   Repository: ${pkg.repository.url}\n\n` +
    `   Build date: ${new Date().toUTCString()}\n\n` +
    "   This program is free software: you can redistribute it and/or modify */\n\n"

const buildOptions = {
    entryPoints: ["src/app.ts"],
    bundle: true,
    minify: dev ? false : true,
    sourcemap: true,
    color: true,
    outdir: "public/dist",
    target: ['chrome58', 'firefox57', 'safari11', 'edge18'],
    banner: {
        js: banner
    },
    loader: {
        ".png": "dataurl",
        ".jpg": "dataurl",
        ".jpeg": "dataurl",
        ".gif": "dataurl",
        ".svg": "dataurl",
    },
    plugins: [
        {
            name: "TypeScriptDeclarationsPlugin",
            setup(build) {
                build.onEnd((result) => {
                    if (result.errors.length > 0) {
                        console.log("\u001b[31mESM Build failed!\u001b[37m")
                        console.log("\u001b[31mTypeScript declarations generation skipped!\u001b[37m")
                        process.exit(1)
                    }
                    execSync("npx tsc --emitDeclarationOnly")
                    console.log("\u001b[36mTypeScript declarations generated!\u001b[37m")
                    // copy src/index.html to public/index.html
                    fs.copyFileSync("src/index.html", "public/index.html")
                    // copy src/icons to public/icons
                    fs.mkdirSync("public/icons", { recursive: true })
                    fs.copyFileSync("src/icons/favicon.ico", "public/favicon.ico")
                    fs.cpSync("src/icons", "public/icons", { recursive: true })
                })
            }
        },
        {
            name: "CopyAssetsPlugin",
            setup(build) {
                build.onEnd((result) => {
                    if (result.errors.length > 0) {
                        console.log("\u001b[31mESM Build failed!\u001b[37m")
                        process.exit(1)
                    }
                    if (!firstBuild) {
                        return
                    }
                    firstBuild = false
                    // Resize images to max 2048px of the longest side using sharp
                    Object.keys(outputQualityFormats).forEach(q => {
                        resizeImagesInDir(INPUT_IMAGE_PATH, OUTPUT_IMAGE_PATH, q)
                    
                        fs.mkdirSync(`public/models/gltf/${q}`, { recursive: true })
                        fs.copyFileSync("src/models/gltf/Virtual Gallery.bin", `public/models/gltf/${q}/Virtual Gallery.bin`)
                        fs.copyFileSync("src/models/gltf/Virtual Gallery.gltf", `public/models/gltf/${q}/Virtual Gallery.gltf`)

                        // Replace the path of the inside textures with the quality subfolder path  
                        const gltf = JSON.parse(fs.readFileSync(`public/models/gltf/${q}/Virtual Gallery.gltf`))
                        gltf.images.forEach((img, i) => {
                            gltf.images[i].uri = img.uri.replace("../textures/", `../../textures/${q}/`)
                        })

                        fs.writeFileSync(`public/models/gltf/${q}/Virtual Gallery.gltf`, JSON.stringify(gltf, null, 2))
                    })
                    fs.mkdirSync("public/models/gltf/additional_models", { recursive: true })
                    fs.cpSync("src/models/gltf/additional_models", "public/models/gltf/additional_models", { recursive: true })
                    // copy src/textures to public/textures if exists (the whole folder, recursively)
                    fs.cpSync("src/loader", "public/loader", { recursive: true })

                    console.log("\u001b[36mAssets copied!\u001b[37m")
                })
            }
        }
    ]
}

if (dev) {
    const ctx = await context(buildOptions)

    if (watch) await ctx.watch().then(() => {
        console.log("\u001b[36mWatching...\u001b[37m")
    })

    // Enable serve mode
    await ctx.serve({
        servedir: "public",
        port: 3000,
        onRequest: (args) => {
            if (args.path === "/") {
                args.path = "/index.html"
            }
            console.log(`\u001b[36m${args.method} ${args.path}\u001b[37m`)
        }
    }).then((server) => {
        console.log(`\u001b[36mServing at http://localhost:${server.port}\u001b[37m`)
        // Open browser
        switch (process.platform) {
            case "darwin":
                execSync(`open http://localhost:${server.port}`)
                break
            case "win32":
                execSync(`start http://localhost:${server.port}`)
                break
            default:
                execSync(`xdg-open http://localhost:${server.port}`)
        }
    })
} else {
    await build(buildOptions)
}

console.log("\u001b[36mESM Build succeeded!\u001b[37m")

// Enable watch mode
