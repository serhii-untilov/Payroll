import { Autocomplete, Box, OutlinedInputProps, TextField, Typography } from '@mui/material';
import { Controller } from 'react-hook-form';
import { InputLabel } from '../layout/InputLabel';

export type FormAutocompleteOption = {
    label: string;
    value: any;
};

export type Props = OutlinedInputProps & {
    name: string;
    valueType: 'number' | 'string';
    control: any;
    label: string;
    rules?: any;
    options: FormAutocompleteOption[];
    autofocus?: boolean;
    disabled?: boolean;
    // sx?: any;
};

export const FormAutocomplete = (props: Props) => {
    return (
        <>
            <InputLabel>{props.label}</InputLabel>
            <Controller
                name={props.name}
                control={props.control}
                rules={props.rules}
                render={({ field: { onChange, value }, fieldState: { error }, formState }) => {
                    return (
                        <Autocomplete
                            disabled={!!props?.disabled}
                            autoFocus={props?.autoFocus}
                            selectOnFocus
                            clearOnEscape
                            handleHomeEndKeys
                            disablePortal
                            // autoSelect !!!
                            // autoHighlight !!!
                            autoComplete
                            // id={'value'}
                            options={props.options}
                            getOptionLabel={(option) => option?.label || ''}
                            getOptionKey={(option) => option?.value || ''}
                            value={props.options.find((o) => o.value === value) || null}
                            isOptionEqualToValue={(option, value) => {
                                return (
                                    option?.value && value?.value && option?.value === value?.value
                                );
                            }}
                            onChange={(event, item) => {
                                onChange(item?.value || (props.valueType === 'number' ? null : ''));
                            }}
                            renderInput={(params) => {
                                return (
                                    <Box sx={{ fontWeight: 'bold' }}>
                                        <TextField
                                            error={error != undefined}
                                            variant="outlined"
                                            label=""
                                            {...params}
                                            size="small"
                                            fullWidth
                                            // sx={props.sx}
                                            // sx={{ fontWeight: 'bold' }}
                                        />
                                    </Box>
                                );
                            }}
                        />
                    );
                }}
            />
        </>
    );
};
