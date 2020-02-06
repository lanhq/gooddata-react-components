// (C) 2019-2020 GoodData Corporation
import without = require("lodash/without");
import { Execution } from "@gooddata/typings";
import { IGeoData, IPushpinColor } from "../../../interfaces/GeoChart";
import {
    DEFAULT_CLUSTER_RADIUS,
    DEFAULT_CLUSTER_MAX_ZOOM,
    DEFAULT_PUSHPIN_SIZE_VALUE,
} from "../../../constants/geoChart";
import { getGeoAttributeHeaderItems } from "../../../helpers/geoChart";
import { getHeaderItemName, isTwoDimensionsData } from "../../../helpers/executionResultHelper";
import { stringToFloat } from "../../../helpers/utils";
import { getPushpinColors, getColorPalette } from "./geoChartColor";
import { DEFAULT_COLORS } from "../../visualizations/utils/color";
import range = require("lodash/range");
import { IHeatmapLegendItem } from "../../visualizations/typings/legend";

type IGeoDataSourceFeature = GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;
export type IGeoDataSourceFeatures = IGeoDataSourceFeature[];

function getLocation(locationValue: Execution.IResultHeaderItem): [number, number] | null {
    if (locationValue && Execution.isAttributeHeaderItem(locationValue)) {
        const latlng = locationValue.attributeHeaderItem.name;
        const [latitude, longitude] = latlng.split(";").map(stringToFloat);
        if (isNaN(latitude) || isNaN(longitude)) {
            // tslint:disable-next-line:no-console
            console.warn("UI-SDK: geoChartDataSource - getLocation: invalid location", locationValue);
        } else {
            return [longitude, latitude];
        }
    }
    return null;
}

function transformPushpinDataSource(
    executionResult: Execution.IExecutionResult,
    geoData: IGeoData,
): IGeoDataSourceFeatures {
    const { color, location, segmentBy, size, tooltipText } = geoData;

    const locationNameTitle = tooltipText ? tooltipText.name : "";
    const colorTitle = color ? color.name : "";
    const sizeTitle = size ? size.name : "";
    const segmentByTitle = segmentBy ? segmentBy.name : "";

    let colorData: Execution.DataValue[] = [];
    let sizeData: Execution.DataValue[] = [];
    const hasColorMeasure = color !== undefined;
    const hasSizeMeasure = size !== undefined;

    const { data } = executionResult;
    if (isTwoDimensionsData(data)) {
        if (hasColorMeasure) {
            colorData = data[color.index];
        }
        if (hasSizeMeasure) {
            sizeData = data[size.index];
        }
    }

    const attributeHeaderItems = getGeoAttributeHeaderItems(executionResult, geoData);

    const locationData = location !== undefined ? attributeHeaderItems[location.index] : [];
    const locationNameData = tooltipText !== undefined ? attributeHeaderItems[tooltipText.index] : [];
    const segmentByData = segmentBy !== undefined ? attributeHeaderItems[segmentBy.index] : [];

    const sizesInNumber = sizeData.map(stringToFloat);
    const colorsInNumber = colorData.map(stringToFloat);
    const pushpinColors: IPushpinColor[] = getPushpinColors(colorsInNumber, segmentByData);

    const features = locationData.reduce(
        (
            result: IGeoDataSourceFeatures,
            locationItem: Execution.IResultHeaderItem,
            index: number,
        ): IGeoDataSourceFeatures => {
            const coordinates = getLocation(locationItem);
            if (!coordinates) {
                return result;
            }

            const colorValue = hasColorMeasure ? colorsInNumber[index] : undefined;
            const sizeValue = hasSizeMeasure ? sizesInNumber[index] : DEFAULT_PUSHPIN_SIZE_VALUE;

            const locationNameValue = getHeaderItemName(locationNameData[index]);
            const segmentByValue = getHeaderItemName(segmentByData[index]);
            const pushpinColor = pushpinColors[index] || pushpinColors[0] || {};

            return [
                ...result,
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates,
                    },
                    properties: {
                        locationName: {
                            title: locationNameTitle,
                            value: locationNameValue,
                        },
                        color: {
                            ...pushpinColor,
                            title: colorTitle,
                            value: colorValue,
                        },
                        size: {
                            title: sizeTitle,
                            value: sizeValue,
                        },
                        segmentBy: {
                            title: segmentByTitle,
                            value: segmentByValue,
                        },
                    },
                },
            ];
        },
        [],
    );

    return features;
}

export const createPushpinDataSource = (
    executionResult: Execution.IExecutionResult,
    geoData: IGeoData,
): mapboxgl.GeoJSONSourceRaw => {
    const source: mapboxgl.GeoJSONSourceRaw = {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: transformPushpinDataSource(executionResult, geoData),
        },
    };
    if (!geoData.size) {
        return {
            ...source,
            cluster: true,
            clusterMaxZoom: DEFAULT_CLUSTER_MAX_ZOOM,
            clusterRadius: DEFAULT_CLUSTER_RADIUS,
        };
    }
    return source;
};

export const calculateColorData = (
    executionResult: Execution.IExecutionResult,
    geoData: IGeoData,
): IHeatmapLegendItem[] => {
    const colorPalette = getColorPalette(DEFAULT_COLORS[0]);
    const {
        color: { index: colorIndex },
    } = geoData;
    const colorSeries = getColorSeries(executionResult, colorIndex);
    const values: number[] = without(colorSeries, null, undefined, NaN);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const offset = (max - min) / 6;

    return range(0, 6).map(
        (index: number): IHeatmapLegendItem => {
            const from = min + offset * index;
            const range = {
                from,
                to: from + offset,
            };
            return {
                range,
                color: colorPalette[index],
                isVisible: true,
                legendIndex: 0,
            };
        },
    );
};

const getColorSeries = (executionResult: Execution.IExecutionResult, colorIndex: number): number[] => {
    let colorData: Execution.DataValue[] = [];
    const { data } = executionResult;
    if (isTwoDimensionsData(data)) {
        colorData = colorIndex ? data[colorIndex] : [];
    }
    return colorData.map(stringToFloat);
};
