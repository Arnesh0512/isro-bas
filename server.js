const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

/* -------------------------------------------------------
   Serve all static files
------------------------------------------------------- */
app.use(express.static(__dirname));

/* -------------------------------------------------------
   Home page
------------------------------------------------------- */
app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "index.html"));

});

/* -------------------------------------------------------
   Images list
------------------------------------------------------- */
app.get("/images-list", (req, res) => {

    const folder = path.join(__dirname, "images");

    fs.readdir(folder, (err, files) => {

        if (err) {

            return res.status(500).json({
                error: "Unable to read images folder."
            });

        }

        const images = files.filter(file =>
            /\.(png|jpg|jpeg|gif|webp)$/i.test(file)
        );

        res.json(images);

    });

});

/* -------------------------------------------------------
   Vercel Export
------------------------------------------------------- */
module.exports = app;

/* -------------------------------------------------------
   Local Development
------------------------------------------------------- */
if (require.main === module) {

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {

        console.log(`Server running on http://localhost:${PORT}`);

    });

}