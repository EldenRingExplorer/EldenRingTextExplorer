

# Elden Ring Text Explorer

Site here - [https://alekslitynski.github.io/EldenRingTextExplorer/](https://eldenringexplorer.github.io/EldenRingTextExplorer/)

This repo contains two things - a tool for parsing the Elden Ring text dump into JSON, and a web interface that makes the JSON easier to explore.

This is based on the text dump found at https://github.com/AsteriskAmpersand/Carian-Archive. I don't know those folks, but they provided a great starting point for this project.

## Parsing the .xml files

1. `npm install`
2. `npm run generate`

This should read through the .xml files in text_dump_en and text_dump_jp, and write the output into elden_ring_text.json.

The JSON file is shaped like:

```
{
    "category_1": ...,       // Item categories, like 'weapon' or 'dialog'
    "category_2": {
        "item_id_1": {       // Unqiue id for the item (only unqiue within the category)
            "name": "",      // Weapon name
            "info": "",      // Other fields are a bit arbitrary
            "caption": "",
            "effect": "",
            "dialog": "",
        }
    }
}
```

Most of the src/main.js script is code to clean up the dialog, which requires a lot of nudging to get into a decent form.


## The Frontend

All the frontend code is in index.html. I'm making this for fun and can't be bothered to set up react or even refactor css into a seperate file.

The frontend does a few things

1. It displays all the text in the game in collapseable sections
2. Each item can be linked to
3. Each item has a link next to it that will search for it on the wiki
4. Items can be filtered by plaintext or a regex. Both are case insensitive. The search is applied to each field of each item. If any field of an item matches the search, the item is kept in the filter.
5. There's a jump table in the side bar to make jumping to different item descriptions easier.
6. Items can be tagged, and you can click a tag to show only items with that tag.
7. The japanese text can be displayed alongside the english text. Might be helpful to bilingual folks trying to see the same thing phrased a different way.
8. Filters and tags are persisted via local storage. They can also be exported/imported as json files.

To run the frontend:

1. `npm install`
2. `npm run serve`
3. Browse to http://localhost:8080
