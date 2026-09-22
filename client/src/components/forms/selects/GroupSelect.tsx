/* eslint-disable react/jsx-props-no-spreading */
import { Autocomplete, TextField } from '@mui/material';
import { useEntities } from '../../../context/EntitiesContext';
import { attributeTypes, returnTypes } from './TypeSelect';

type GroupSelectProps = {
  option: string;
  setOption: (option: string) => void;
  label: string;
  width?: number;
  primitiveType?: 'attribute' | 'return';
  includeClasses?: boolean;
  includeInterfaces?: boolean;
  includeEnums?: boolean;
  restrictOptions?: boolean;
};

type GroupOption = {
  type: string | undefined;
  name: string;
};

function GroupSelect({
  option,
  setOption,
  label,
  width = 250,
  primitiveType,
  includeClasses = false,
  includeInterfaces = false,
  includeEnums = false,
  restrictOptions = false,
}: GroupSelectProps) {
  const entities = useEntities();

  const classes: GroupOption[] = includeClasses
    ? entities
        .filter((e) => e.type === 'class')
        .map((e) => ({ type: e.type, name: e.data.name }))
    : [];
  const interfaces: GroupOption[] = includeInterfaces
    ? entities
        .filter((e) => e.type === 'interface')
        .map((e) => ({ type: e.type, name: e.data.name }))
    : [];
  const enums: GroupOption[] = includeEnums
    ? entities
        .filter((e) => e.type === 'enum')
        .map((e) => ({ type: e.type, name: e.data.name }))
    : [];
  const prims =
    primitiveType === 'attribute'
      ? attributeTypes.map((t) => ({ type: 'primitive', name: t }))
      : primitiveType === 'return'
      ? returnTypes.map((t) => ({ type: 'primitive', name: t }))
      : [];

  const options = [...prims, ...classes, ...interfaces, ...enums];

  return (
    <Autocomplete
      id={`${label}-select`}
      freeSolo={!restrictOptions}
      options={options}
      value={option ? { name: option, type: undefined } : null}
      isOptionEqualToValue={(opt, val) => {
        const optName = typeof opt === 'string' ? opt : opt.name;
        const valName = typeof val === 'string' ? val : val.name;
        return optName === valName;
      }}
      onInputChange={(e, value) => {
        setOption(value);
      }}
      getOptionLabel={(opt) =>
        typeof opt === 'string' ? opt : (opt as GroupOption).name
      }
      groupBy={(opt) => opt.type || ''}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="standard"
          required
          sx={{ width }}
        />
      )}
      clearOnBlur
      selectOnFocus
    />
  );
}

export default GroupSelect;
