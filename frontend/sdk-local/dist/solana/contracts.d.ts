export interface ZylithProgramIds {
    pool: string;
    coordinator: string;
}
export declare function assertProgramIds(programs: ZylithProgramIds): ZylithProgramIds;
export type ZylithContractAddresses = ZylithProgramIds;
export declare const assertContractAddresses: typeof assertProgramIds;
//# sourceMappingURL=contracts.d.ts.map