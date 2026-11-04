import { definePatch } from "../modUtils.js";

export default definePatch(({ matchOne, replaceOne }) => {
  const { bounds, mapSize, mapWidthField, mapHeightField } = matchOne(
    /this\.(?<bounds>\w+)\[0\]=(?<mapSize>\w+)\.(?<mapWidthField>\w+);this\.\k<bounds>\[1\]=\k<mapSize>\.(?<mapHeightField>\w+);/g
  ).groups;
  const { mapAccess, offsetMethod } = matchOne(
    new RegExp(`if\\(\\w+\\[(?<mapAccess>\\w+)\\.(?<offsetMethod>\\w+)\\(\\w+,\\w+\\)\\+2\\]===1\\)\\{this\\.${bounds}\\[0\\]=\\w+;`, "g")
  ).groups;
  const { isPlayerCellMethod } = matchOne(
    /this\.(?<isPlayerCellMethod>\w+)=function\((?<playerParam>\w+),(?<offsetParam>\w+)\)\{return\s*this\.\w+\(\k<offsetParam>\)&&this\.\w+\(\k<playerParam>,\k<offsetParam>\)\}/g
  ).groups;
  replaceOne(
    new RegExp(`(?<mapImage>\\w+)=(?<mapContext>\\w+)\\.getImageData\\(0,0,(?<imageMapSize>\\w+)\\.${mapWidthField},\\k<imageMapSize>\\.${mapHeightField}\\);(?<mapData>\\w+)=\\k<mapImage>\\.data;`, "g"),
    `$&__fx.selfTerritoryHighlight.install($<mapContext>,${mapAccess},${mapSize},"${offsetMethod}","${isPlayerCellMethod}","${mapWidthField}","${mapHeightField}");`
  );
});
