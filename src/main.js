
import xml2js from 'xml2js';
import { promises as fs } from 'fs';


const collectables = [

];

// name, title,
// info,
// caption, body
// effect, info2
// dialog,

// group, name, info, caption, effect, dialog
const fileGroups = [
    // items/armor/etc
    {group: "accessories", name: "AccessoryName", info: "AccessoryInfo", caption: "AccessoryCaption" },
    {group: "arts", name: "ArtsName", caption: "ArtsCaption" },
    {group: "gems", name: "GemName", caption: "GemCaption", effect: "GemEffect", info: "GemInfo" },
    {group: "goods", name: "GoodsName", caption: "GoodsCaption", effect: "GoodsInfo2", info: "GoodsInfo", dialog: "GoodsDialog" },
    {group: "loading", name: "LoadingTitle", caption: "LoadingText" },
    {group: "magic", name: "MagicName", caption: "MagicCaption", info: "MagicInfo" },
    {group: "protector", name: "ProtectorName", caption: "ProtectorCaption", info: "ProtectorInfo" },
    {group: "tutorial", name: "TutorialTitle", caption: "TutorialBody" },
    {group: "weapon", name: "WeaponName", caption: "WeaponCaption", effect: "WeaponEffect", info: "WeaponInfo" },
    
    // these are all in game prompts. Both player messages and popups like "Selvuses Puppet: Do not touch"
    {group: "prompt_gameplay", info: "EventTextForMap"},
    {group: "prompt_gameplay", info: "EventTextForTalk"},
    {group: "prompt_gameplay", info: "BloodMsg"},
    {group: "prompt_gameplay", info: "ActionButtonText"},
    {group: "prompt_gameplay", info: "GR_Dialogues"},
    {group: "prompt_gameplay", info: "GR_KeyGuide"},
    {group: "prompt_gameplay", info: "GR_MenuText"},
    {group: "prompt_gameplay", info: "NetworkMessage"},
    {group: "prompt_gameplay", info: "GR_System_Message_win64"}, // this is actually a single line from a subtitle. Not sure where the rest are

    // split out from general prompts becaues it has species descriptions
    {group: "prompt_character_creation", info: "GR_LineHelp"},

    // _really boring_ prompts. Stuff like screen brightness and the terms of service
    {group: "prompt_game_systems", info: "GR_System_Message_win64"},
    {group: "prompt_game_systems", info: "TextEmbedImageName_win64"},
    {group: "prompt_game_systems", info: "ToS_win64"},


    {group: "npcs", name: "NpcName"},
    {group: "places", name: "PlaceName"},

    // dialog is a special case, will require extra parsing
    {group: "dialog", info: "TalkMsg"},
];

const getTime = () => {
    var hrTime = process.hrtime()
    return hrTime[0] * 1000000 + hrTime[1] / 1000; 
};

const loadFile = (() => {
    const fileCache = {};
    return async fileName => {
        if (!fileName) return {};
        if (fileCache[fileName]) return fileCache[fileName];
        const xml_en = await fs.readFile(`text_dump_en/${fileName}.fmg.xml`);
        const xml_jp = await fs.readFile(`text_dump_jp/${fileName}.fmg.xml`);
        const result_en = await xml2js.parseStringPromise(xml_en);
        const result_jp = await xml2js.parseStringPromise(xml_jp);
        const items = {};
        for (let i in result_en.fmg.entries[0].text) {
            const en = result_en.fmg.entries[0].text[i];
            const jp = result_jp.fmg.entries[0].text[i];
            if (en._ == "%null%") continue;
            items[en.$.id] = {en: en._, jp: jp._};
        }
        fileCache[fileName] = items;
        return items;
    };
})();

const loadFileGroups = async toLoad => {
    const loadableProps = ["name", "info", "caption", "effect", "dialog"];
    const groups = {};
    for (let nextGroup of toLoad) {
        groups[nextGroup.group] = groups[nextGroup.group] || {};
        const group = groups[nextGroup.group];

        for (let prop of loadableProps) {
            const content = await loadFile(nextGroup[prop]);
            for (let [id, value] of Object.entries(content)) {
                group[id] = group[id] || {};
                group[id][`${prop}_en`] = value.en;
                group[id][`${prop}_jp`] = value.jp;
            }
        }
    }
    return groups;
}

// annotate NPCs with npcIds and types by parsing the id
const groups = await loadFileGroups(fileGroups);
for (let [id, npc] of Object.entries(groups.npcs)) {
    // NPC ids have three forms:
    // 903251600 -> starts with 9, its a boss
    // 10104137 -> starts with 10, its "Someone Yet Unseen"
    // 135500 -> [1][2550][0] 1 = NPC. 2550 = NPC ID. 0 = npc varient. Eg "Okina" and "Bloody Finger Okina"
    //              bosses may also have varient IDs, but I haven't bothered to look


    let idStr = id.toString();
    if (idStr.startsWith("10")) {
        npc.type = "unmet";
        continue;
    }
    if (idStr.startsWith("9")) {
        npc.type = "boss";
        npc.id = idStr;
        continue;
    }
    npc.type = "npc";
    npc.form = idStr.slice(-1);
    npc.id = idStr.slice(1, -2);
    id.toString().slice()
}

// annotate dialogs with sections/dialogs/npcs
for(let [lineId, line] of Object.entries(groups.dialog)) {
    const idStr = lineId.toString();
    if (idStr.length < 8) {
        // there's a handful of cut dialogs that have broken dialog ids
        line.npc = "Narator";
        line.npcId = "0";
        line.sectionId = "0";
        line.dialogId = "0";
        continue;
    }

    
    line.npcId = (["200", "201", "202", "203", "204" ].some(e => idStr.startsWith(e))) ? idStr.slice(0, 4) : idStr.slice(0, 3); // 204 space is boss fight dialog, and we need to know the full id
    line.sectionId = idStr.slice(4, 7);
    line.dialogId = idStr.slice(0, 7);
    line.sectionId = idStr.slice(7);

    
    // some dialog npc ids point to the wrong NPCs. Eg - the opening spearch is attributed to
    // master lucet. All Ranni/Rennala and Malania's boss fight dialog is attributed to non-existant NPCs
    // the mapping is pretty obvious, though, so do some simple fixup here
    const npcFixupIds = {
        "110": "0", // Narator/unknown
        "120": "0", // Narator/unknown
        "130": "0", // Narator/unknown
        "140": "0", // Narator/unknown
        "150": "0", // Narator/unknown
        "160": "0", // Narator/unknown
        "165": "0", // Narator/unknown
        "2025": "106", // Ranni
        "1062": "106", // Ranni
        "1063": "106", // Ranni
        "2049": "106", // Ranni
        "1060": "106", // Ranni
        "2039": "902120000", // Malenia
        "2026": "902120000", // Malenia
        "2027": "902120000", // Malenia
        "2028": "902110001", // Maliketh
        "2023": "902110001", // Maliketh
        "2020": "202", // Gurranq
        "2030": "904710001", // Rykard
        "2149": "904710001", // Rykard
        "214": "904710001", // Rykard
        "2040": "902130000", // Margit
        "2003": "902130000", // Margit
        "2004": "904750000", // Godrick
        "2005": "904750000", // Godrick
        "7300": "904750000", // Godrick
        "207": "904750000", // Godrick
        "208": "904750000", // Godrick
        "2004": "904750000", // Godrick
        "2007": "904720002", // Godfrey
        "2008": "904720002", // Godfrey
        "206": "904720002", // Godfrey
        "2007": "904720002", // Godfrey
        "2008": "904720002", // Godfrey
        "2010": "902030000", // Rennala (technically, the culvers)
        "2024": "200", // Rennala 
        "2000": "200", // Rennala 
        "2014": "904800000", // Mohg
        "209": "904800000", // Mohg
        "2021": "902130002", // Morgott
        "2043": "100", // Melina
        "2001": "100", // Melina
        "1001": "100", // Melina
        "205": "100", // Melina
        "2001": "100", // Melina
        "2201": "220", // Alexander (when stuck in a hole)
        "2208 ": "220", // Alexander
        "2131": "213", // Hewg
        "1011": "102", // Enia
        "1009": "750", // finger reader (I'm not sorting out which one is which)
        "101": "750", // finger reader
        "8008": "801", // nomadic merchant
        "8001": "801", // nomadic merchant
        "7050": "301", // Varre
        "3071": "307", // Seluvis
        "3078": "307", // Seluvis
        "3072": "217", // Pidia
        "3108": "217", // Pidia
    }
    if (npcFixupIds[line.npcId]) line.npcId = npcFixupIds[line.npcId];

    // The melina dialog below "060" are wrongly attributed to melina
    if (line.npcId === "1000" && line.dialogId.slice(4, 7).startsWith("0")) {
        line.npcId = "0";
        line.sectionId = "0";
        line.dialogId = "0";
    }

    const npcs = Object.entries(groups.npcs).filter(([id, npc]) => npc.id === line.npcId);
    if (npcs.length > 0) line.npc = npcs[0][1].name_en;
    
    if (!line.npc && line.npcId.startsWith("9")) {
        line.npc = "Stage Directions";
        line.npcId = "9";
    }
    if (!line.npc && line.npcId.startsWith("2045")) {
        line.npc = "Stage Directions";
        line.npcId = "2045";
    }
    if (!line.npc && line.npcId.startsWith("337")) {
        line.npc = "Omenhunter Shanehaight (cut npc)";
        line.npcId = "337";
    }
    if (!line.npc && line.npcId.startsWith("7")) {
        line.npc = "Ghost";
        line.npcId = "7";
    }
    if (!line.npc && line.npcId.startsWith("303")) {
        line.npc = "Guilbert the Redeemer (cut npc)";
        line.npcId = "303";
    }
    if (!line.npc && line.npcId.startsWith("227")) {
        line.npc = "Aurelia's Sister";
        line.npcId = "227";
    }
    if (!line.npc && line.npcId.startsWith("332")) {
        line.npc = "Knight of Rykard";
        line.npcId = "332";
    }
    if (!line.npc && line.npcId.startsWith("2048")) {
        line.npc = "End of Game Dialog + Extra Morgott";
        line.npcId = "2048";
    }
    if (!line.npc && line.npcId == "0") line.npc = "Narator";
}

let packedDialog = {};
for (let line of Object.values(groups.dialog)) {
    packedDialog[line.dialogId] = packedDialog[line.dialogId] || { 
        name_en: (line.npc ? line.npc : "Unknown NPC " + line.npcId) + " dialog",
        id: line.npcId,
        sections: []
    };
    packedDialog[line.dialogId].sections.push(line);
}


for (let dialog of Object.values(packedDialog)) {
    dialog.info_en = "";
    dialog.info_jp = "";
    const sortedSections = Object.values(dialog.sections.sort((a, b) => a.sectionId.localeCompare(b.sectionId)));
    for (let section of sortedSections) {
        if (section.info_en) dialog.info_en += " " + section.info_en ?? "<br/>";
        if (section.info_jp) dialog.info_jp += " " + section.info_jp ?? "<br/>";
    }
    delete dialog.sections;
}

groups.dialog = Object.entries(packedDialog).reduce((acc, [id, dialog]) => {
    dialog.lineId = id;
    if (!acc[dialog.id]) {
        acc[dialog.id] = [dialog];
    } else {
        acc[dialog.id].push(dialog);
    }
    return acc;
}, {});

groups.dialog = Object.fromEntries(Object.entries(groups.dialog).map(([k, val]) => {
    const sorted = val.sort((a, b) => a.lineId.localeCompare(b.lineId));
    const en = sorted.map(i => `[${i.lineId}] ${i.info_en}`).join(`<br/><br/>`);
    const jp = sorted.map(i => `[${i.lineId}] ${i.info_jp}`).join(`<br/><br/>`);

    return [k, {
        name_en: val[0].name_en,
        id: k,
        info_en: en,
        info_jp: jp,
    }];
}));

// packedDialog = Object.fromEntries(Object.entries(packedDialog).filter(([id, val]) => val.info_en.trim() !== ""));


await fs.writeFile('elden_ring_text.json', JSON.stringify(groups, null, 4));



