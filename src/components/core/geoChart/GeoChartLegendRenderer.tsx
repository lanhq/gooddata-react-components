// (C) 2020 GoodData Corporation
import * as React from "react";
import without = require("lodash/without");
import cx from "classnames";
import { Execution } from "@gooddata/typings";
import { stringToFloat } from "../../../helpers/utils";
import { IntlWrapper } from "../../core/base/IntlWrapper";
import { IntlTranslationsProvider, ITranslationsComponentProps } from "../../core/base/TranslationsProvider";
import PushpinSizeLegend from "./legends/PushpinSizeLegend";
import { getGeoData, getFormatFromExecutionResponse } from "../../../helpers/geoChart";
import { IGeoConfig, IGeoData } from "../../../interfaces/GeoChart";
import { TOP } from "../../visualizations/chart/legend/PositionTypes";
import { isTwoDimensionsData } from "../../../helpers/executionResultHelper";
import HeatmapLegend from "../../visualizations/chart/legend/HeatmapLegend";
import { IHeatmapLegendItem } from "../../visualizations/typings/legend";

export interface IGeoChartLegendRendererProps {
    config: IGeoConfig;
    execution: Execution.IExecutionResponses;
    colorData: IHeatmapLegendItem[];
    colorFormat: string;
    locale: string;
    position?: string;
}
export default function GeoChartLegendRenderer(props: IGeoChartLegendRendererProps): JSX.Element {
    if (!props.execution) {
        return null;
    }
    const {
        execution: { executionResult, executionResponse },
        config: { mdObject: { buckets = [] } = {} },
        locale,
        position = TOP,
        colorData,
        colorFormat,
    } = props;
    const geoData: IGeoData = getGeoData(buckets, executionResponse.dimensions);
    const { data } = executionResult;
    const { size } = geoData;
    const classes = cx("geo-legend s-geo-legend", `position-${position}`, !!size && "has-size-legend");

    if (!size || !isTwoDimensionsData(data)) {
        return null;
    }

    return (
        <div className={classes}>
            {renderColorAxisLegend(colorData, colorFormat, locale)}
            {size &&
                renderPushpinSizeLegend(
                    data[size.index].map(stringToFloat),
                    getFormatFromExecutionResponse(size.index, executionResponse),
                    locale,
                )}
        </div>
    );
}

function renderPushpinSizeLegend(sizeValues: number[], format: string, locale: string): JSX.Element {
    const values: number[] = without(sizeValues, null, undefined, NaN);
    return (
        <IntlWrapper locale={locale}>
            <IntlTranslationsProvider>
                {(props: ITranslationsComponentProps) => (
                    <PushpinSizeLegend numericSymbols={props.numericSymbols} format={format} sizes={values} />
                )}
            </IntlTranslationsProvider>
        </IntlWrapper>
    );
}

function renderColorAxisLegend(colorData: IHeatmapLegendItem[], format: string, locale: string): JSX.Element {
    return (
        <IntlWrapper locale={locale}>
            <IntlTranslationsProvider>
                {(props: ITranslationsComponentProps) => (
                    <HeatmapLegend
                        series={colorData}
                        format={format}
                        isSmall={false}
                        numericSymbols={props.numericSymbols}
                        position="top"
                    />
                )}
            </IntlTranslationsProvider>
        </IntlWrapper>
    );
}
