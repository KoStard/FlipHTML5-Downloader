/* jshint esversion: 6 */
const fs = require('fs');
const request = require('request');
const PDFKit = require('pdfkit');
const imageSize = require('image-size');

const urlInput = document.getElementById('url-input');
const downloadButton = document.getElementById('download-button');
const baseDir = __dirname + '/../';
const imagesTempFolder = baseDir + 'temp/';

downloadButton.onclick = downloadButtonClicked;
let downloader;
let filename = "";
let length = 0;
let format = '.jpg';
function downloadButtonClicked() {
    if (!fs.existsSync(imagesTempFolder)) {
        fs.mkdirSync(imagesTempFolder);
    }
    let rawURL = urlInput.value; 
    request(rawURL, (err, resp, body) => {
        let m = body.match(/[\s\S]*pages:\s*"?(\d+)"?,\s*title:\s*"([^"]+)",/); //
        length = parseInt(m[1]);
        filename = m[2] + '.pdf';
        let finalURL = 'http://online.' + rawURL.match(/(?:http(?:s)?:\/\/)([\s\S]*)/)[1] + '/files/large/';
        console.log(`URL - ${finalURL}`);
        console.log(`Filename - ${filename}`);
        downloader = downloadAll(finalURL, length, format);
        downloader.next();
    });

}

let done = false;
function* downloadAll(url, length, format){
    done = false;
    for (let i = 1; i <= length; i++){
        console.log(`Downloading page ${i}/${length}`);
        yield download(url+i+format, i+format);
    }
}

function download(url, filename){
    request(url).pipe(fs.createWriteStream(imagesTempFolder + filename)).on('close', () => {
        if (!done){
            let resp = downloader.next();
            done = resp.done;
            if (done){
                console.log("Done.");
                convertToPDF();
            }
        }
    });
}

function convertToPDF(){
    console.log("Creating the PDF");
    let doc;
    for (let i = 0; i < length; i++){
        console.log(`Adding image ${i+1}/${length}`);
        let imgName = imagesTempFolder + (i + 1) + format;
        let imgSize = imageSize(imgName);
        if (!i) {
            doc = new PDFKit({
                size: [imgSize.width, imgSize.height],
            });
            doc.pipe(fs.createWriteStream(baseDir + filename));
        } else {
            doc.addPage({
                size: [imgSize.width, imgSize.height],
            });
        }
        doc.image(imgName, 0, 0, {
            fit: [imgSize.width, imgSize.height],
            align: 'center',
            valign: 'center',
        });
        fs.unlinkSync(imgName);
    }
    console.log("Done creating PDF"); 
    doc.end();
    fs.rmdirSync(imagesTempFolder);
}