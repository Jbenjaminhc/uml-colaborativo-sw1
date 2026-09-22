/* eslint-disable react/jsx-props-no-spreading */
import { Autocomplete, TextField } from '@mui/material';
import { DataType } from '../../../types';

export const attributeTypes: DataType[] = [
  'int',
  'float',
  'long',
  'double',
  'char',
  'boolean',
  'string',
  'date',
  'datetime',
];

export const returnTypes: DataType[] = [
  'int',
  'float',
  'long',
  'double',
  'char',
  'boolean',
  'string',
  'void',
];

type TypeSelectProps = {
  option: DataType | string;
  setOption: (option: DataType | string) => void;
};

function TypeSelect({ option, setOption }: TypeSelectProps) {
  return (
    <Autocomplete
      id="type-select"
      freeSolo
      options={attributeTypes}
      value={option}
      onInputChange={(e, value) => {
        setOption(value as DataType);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Type"
          variant="standard"
          required
          sx={{ width: 90 }}
        />
      )}
    />
  );
}

export default TypeSelect;
