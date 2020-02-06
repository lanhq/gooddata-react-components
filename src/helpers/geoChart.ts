// (C) 2019-2020 GoodData Corporation
import get = require("lodash/get");
import { VisualizationObject, Execution } from "@gooddata/typings";
import { IGeoData, IObjectMapping } from "../interfaces/GeoChart";
import { COLOR, LOCATION, SEGMENT_BY, SIZE, TOOLTIP_TEXT } from "../constants/bucketNames";
import {
    getAttributeHeadersInDimension,
    getMeasureGroupHeaderItemsInDimension,
} from "./executionResultHelper";
import { IColorStrategy } from "../components/visualizations/chart/colorFactory";
import { isEmpty, without } from "lodash";

const NUMBER_PRECISION = 15;
const DEFAULT_COLOR_INDEX = 1;
const DEFAULT_COLOR_COUNT = 6;
export function getGeoData(
    buckets: VisualizationObject.IBucket[],
    dimensions: Execution.IResultDimension[],
): IGeoData {
    const measureGroupHeader: Execution.IMeasureHeaderItem[] = getMeasureGroupHeaderItemsInDimension(
        dimensions,
    );
    const attributeHeaders: Array<
        Execution.IAttributeHeader["attributeHeader"]
    > = getAttributeHeadersInDimension(dimensions);

    const bucketItemInfos = buckets.reduce(
        (result: IObjectMapping, bucket: VisualizationObject.IBucket): IObjectMapping => ({
            ...result,
            [bucket.localIdentifier]: {
                uri:
                    get(bucket, "items.0.visualizationAttribute.displayForm.uri") ||
                    get(bucket, "items.0.measure.definition.measureDefinition.item.uri"),
                localIdentifier:
                    get(bucket, "items.0.visualizationAttribute.localIdentifier") ||
                    get(bucket, "items.0.measure.localIdentifier"),
            },
        }),
        {},
    );

    const geoData: IGeoData = {};

    [LOCATION, SEGMENT_BY, TOOLTIP_TEXT].forEach(
        (bucketName: string): void => {
            const bucketItemInfo = bucketItemInfos[bucketName];
            if (!bucketItemInfo) {
                return;
            }
            const index = attributeHeaders.findIndex(
                (attributeHeader: Execution.IAttributeHeader["attributeHeader"]): boolean =>
                    attributeHeader.localIdentifier === bucketItemInfo.localIdentifier ||
                    attributeHeader.uri === bucketItemInfo.uri,
            );
            if (index !== -1) {
                geoData[bucketName] = {
                    index,
                    name: attributeHeaders[index].name,
                };
            }
        },
    );

    [SIZE, COLOR].forEach(
        (bucketName: string): void => {
            const bucketItemInfo = bucketItemInfos[bucketName];
            if (!bucketItemInfo) {
                return;
            }
            const index = measureGroupHeader.findIndex(
                (measureHeaderItem: Execution.IMeasureHeaderItem): boolean =>
                    measureHeaderItem.measureHeaderItem.localIdentifier === bucketItemInfo.localIdentifier ||
                    measureHeaderItem.measureHeaderItem.uri === bucketItemInfo.uri,
            );
            if (index !== -1) {
                geoData[bucketName] = {
                    index,
                    name: measureGroupHeader[index].measureHeaderItem.name,
                };
            }
        },
    );

    return geoData;
}

export function getGeoAttributeHeaderItems(
    executionResult: Execution.IExecutionResult,
    geoData: IGeoData,
): Execution.IResultHeaderItem[][] {
    const { color, size } = geoData;

    const hasColorMeasure = color !== undefined;
    const hasSizeMeasure = size !== undefined;
    const attrHeaderItemIndex = hasColorMeasure || hasSizeMeasure ? 1 : 0;
    const attributeHeaderItems = executionResult.headerItems[attrHeaderItemIndex];

    return attributeHeaderItems;
}

export function isDataOfReasonableSize(
    executionResult: Execution.IExecutionResult,
    geoData: IGeoData,
    limit: number,
): boolean {
    const { location } = geoData;

    const attributeHeaderItems = getGeoAttributeHeaderItems(executionResult, geoData);
    const locationData = location !== undefined ? attributeHeaderItems[location.index] : [];

    return locationData.length <= limit;
}

export function calculateAverage(values: number[] = []): number {
    if (!values.length) {
        return 0;
    }
    return values.reduce((a: number, b: number): number => a + b, 0) / values.length;
}

export function getFormatFromExecutionResponse(
    indexMeasure: number,
    result: Execution.IExecutionResponse,
): string {
    return get(
        result,
        `dimensions[0].headers[0].measureGroupHeader.items[${indexMeasure}].measureHeaderItem.format`,
    );
}

export function getColorAxisData(
    seriesData: number[] = [],
    colorStrategy: IColorStrategy,
): Highcharts.ColorAxisDataClassesOptions[] {
    const values: number[] = without(seriesData.map((item: any) => item.value), null, undefined, NaN);

    if (isEmpty(values)) {
        return [];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const safeMin = parseFloat(Number(min).toPrecision(NUMBER_PRECISION));
    const safeMax = parseFloat(Number(max).toPrecision(NUMBER_PRECISION));
    const colorAxisData = [];

    if (min === max) {
        colorAxisData.push({
            from: min,
            to: max,
            color: colorStrategy.getColorByIndex(DEFAULT_COLOR_INDEX),
        });
    } else {
        const step = (safeMax - safeMin) / DEFAULT_COLOR_COUNT;
        let currentSum = safeMin;
        for (let i = 0; i < DEFAULT_COLOR_COUNT; i += 1) {
            colorAxisData.push({
                from: currentSum,
                to: i === DEFAULT_COLOR_COUNT - 1 ? safeMax : currentSum + step,
                color: colorStrategy.getColorByIndex(i),
            });
            currentSum += step;
        }
    }

    return colorAxisData;
}
