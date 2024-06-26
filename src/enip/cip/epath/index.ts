import { EPathData, EPathDataElementTypes, EPathDataTypes } from './data';
import { EPathLogical, EPathLogicalTypes } from './logical';
import { EPathPort } from './port';

/**
 * Epath segment Types
 */
export enum SegmentTypes
{
    PORT = 0 << 5, // Communication Port to Leave Node (Shall be 1 for a Backplane), Link Address of Next Device
    LOGICAL = 1 << 5,
    NETWORK= 2 << 5,
    SYMBOLIC= 3 << 5,
    DATA= 4 << 5,
    DATATYPE_1= 5 << 5,
    DATATYPE_2= 6 << 6
}

//Export child modules
export { 
    EPathData, EPathDataElementTypes, EPathDataTypes, 
    EPathLogical, EPathLogicalTypes, 
    EPathPort
};