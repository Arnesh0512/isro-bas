const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.static(__dirname));

app.get("/images-list", (req, res) => {

    const folder = path.join(__dirname, "images");

    fs.readdir(folder, (err, files)=>{

        if(err){
            return res.status(500).send(err);
        }

        const images = files.filter(file =>
            /\.(png|jpg|jpeg|gif|webp)$/i.test(file)
        );

        res.json(images);

    });

});

app.listen(3000, ()=>{
    console.log("Server running");
});