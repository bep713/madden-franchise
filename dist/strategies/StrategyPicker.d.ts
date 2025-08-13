export default StrategyPicker;
declare namespace StrategyPicker {
    /**
     * @returns GameStrategy
     */
    function pick(type: any): {
        name: string;
        file: FileStrategy;
        /**
         * @returns GameStrategy
         */
        table: TableStrategy;
        table2Field: Table2FieldStrategy;
        table3Field: Table3FieldStrategy;
    };
}
//# sourceMappingURL=StrategyPicker.d.ts.map