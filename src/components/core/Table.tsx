import * as React from 'react';
import { PureTable, ITableProps } from './PureTable';
import { SortableTable } from './SortableTable';

export class Table extends React.Component<ITableProps, null> {
    public render() {
        if (this.props.environment === 'dashboards') {
            return (
                <SortableTable {...this.props} />
            );
        }

        return (
            <PureTable {...this.props} />
        );
    }
}
