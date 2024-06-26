import {
    Autocomplete,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    OutlinedInput,
    TextField,
    createFilterOptions,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { createPerson, getPersonList } from '../../services/person.service';
import { Button } from '../layout/Button';
import { InputLabel } from '../layout/InputLabel';

export interface Props {
    name: string;
    control: any;
    label: string;
    autoFocus?: boolean;
}

interface OptionType {
    inputValue?: string;
    label: string;
    value: number | null;
}

const filter = createFilterOptions<OptionType>();

const personDefaultValues = {
    lastName: '',
    firstName: '',
    middleName: '',
    taxId: '',
    birthday: '',
    sex: '',
};

export const SelectPerson = (props: Props) => {
    const { t } = useTranslation();
    const [open, toggleOpen] = useState(false);
    const [dialogValue, setDialogValue] = useState(personDefaultValues);
    const queryClient = useQueryClient();

    const handleClose = () => {
        setDialogValue(personDefaultValues);
        toggleOpen(false);
    };

    const {
        data: options,
        isError,
        error,
    } = useQuery<OptionType[], Error>({
        queryKey: ['person', 'SelectPerson'],
        queryFn: async () => {
            const personList = await getPersonList();
            return personList
                .map((o) => {
                    return {
                        inputValue: '',
                        label: o.fullName || '',
                        value: o.id,
                    };
                })
                .sort((a, b) => a.label.toUpperCase().localeCompare(b.label.toUpperCase()));
        },
    });

    if (isError) {
        return enqueueSnackbar(`${error.name}\n${error.message}`, {
            variant: 'error',
        });
    }

    return (
        <>
            <InputLabel>{props.label}</InputLabel>
            <Controller
                name={props.name}
                control={props.control}
                render={({ field: { onChange, value }, fieldState: { error }, formState }) => {
                    return (
                        <>
                            <Autocomplete
                                selectOnFocus
                                clearOnEscape
                                handleHomeEndKeys
                                disablePortal
                                // autoSelect !!!
                                // autoHighlight !!!
                                autoComplete
                                options={options || []}
                                defaultValue={null}
                                getOptionLabel={(option) => {
                                    // Value selected with enter, right from the input
                                    if (typeof option === 'string') {
                                        return option;
                                    }
                                    // Add "xxx" option created dynamically
                                    if (option.inputValue) {
                                        return option.inputValue;
                                    }
                                    // Regular option
                                    return option.label || '';
                                }}
                                getOptionKey={(option) => option?.value || ''}
                                value={options?.find((o) => o.value === value) || null}
                                isOptionEqualToValue={(option, value) =>
                                    option?.value === value?.value
                                }
                                onChange={(event, option) => {
                                    console.log('onChange', option);
                                    if (typeof option === 'string') {
                                        const [lastName, firstName, middleName] = (
                                            option as string
                                        ).split(' ', 3);
                                        // timeout to avoid instant validation of the dialog's form.
                                        setTimeout(() => {
                                            toggleOpen(true);
                                            setDialogValue({
                                                ...personDefaultValues,
                                                lastName,
                                                firstName,
                                                middleName,
                                            });
                                        });
                                        // onChange(null);
                                    } else if (option && option.inputValue) {
                                        // onChange(null);
                                        // Create a new value from the user input
                                        const [lastName, firstName, middleName] =
                                            option.inputValue.split(' ', 3);
                                        toggleOpen(true);
                                        setDialogValue({
                                            ...personDefaultValues,
                                            lastName,
                                            firstName,
                                            middleName,
                                        });
                                    } else {
                                        onChange(option?.value || null);
                                    }
                                }}
                                renderOption={(props, option) => <li {...props}>{option.label}</li>}
                                filterOptions={(options, params) => {
                                    const filtered = filter(options, params);
                                    const { inputValue } = params;
                                    // Suggest the creation of a new value
                                    const isExisting = options.some(
                                        (option) => inputValue === option.label,
                                    );
                                    if (inputValue !== '' && !isExisting) {
                                        filtered.push({
                                            inputValue,
                                            label: `${t('Add')} "${inputValue}"`,
                                            value: null,
                                        });
                                    }

                                    return filtered;
                                }}
                                renderInput={(params) => {
                                    return (
                                        <TextField
                                            autoFocus={!!props?.autoFocus}
                                            autoComplete="SelectOrCreatePerson"
                                            error={error != undefined}
                                            variant="outlined"
                                            label=""
                                            {...params}
                                            size="small"
                                            fullWidth
                                            placeholder={t('Vacancy')}
                                        />
                                    );
                                }}
                            />
                            <Dialog open={open} onClose={handleClose} disableRestoreFocus>
                                <form
                                    onSubmit={async (event: React.FormEvent<HTMLFormElement>) => {
                                        event.preventDefault();
                                        const person = await createPerson({
                                            firstName: dialogValue.firstName,
                                            lastName: dialogValue.lastName,
                                            middleName: dialogValue.middleName,
                                            taxId: dialogValue.taxId,
                                            birthday: dialogValue.birthday
                                                ? new Date(dialogValue.birthday)
                                                : null,
                                            sex: dialogValue.sex,
                                        });
                                        onChange(person.id);
                                        await queryClient.invalidateQueries({
                                            queryKey: ['person'],
                                            refetchType: 'all',
                                        });
                                        handleClose();
                                    }}
                                >
                                    <DialogTitle>{t('Add a new person')}</DialogTitle>
                                    <DialogContent>
                                        <DialogContentText sx={{ mb: 2, pt: 0 }}>
                                            {t('Employee not yet registered? Please add.')}
                                        </DialogContentText>
                                        <Grid container item xs={12} spacing={2}>
                                            <Grid item xs={12}>
                                                <InputLabel>{t('Last Name')}</InputLabel>
                                                <OutlinedInput
                                                    autoFocus
                                                    size="small"
                                                    fullWidth
                                                    id="lastName"
                                                    name="lastName"
                                                    label=""
                                                    value={dialogValue.lastName}
                                                    onChange={(event) =>
                                                        setDialogValue({
                                                            ...dialogValue,
                                                            lastName: event.target.value,
                                                        })
                                                    }
                                                    type="text"
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <InputLabel>{t('First Name')}</InputLabel>
                                                <OutlinedInput
                                                    size="small"
                                                    fullWidth
                                                    name="lastName"
                                                    label=""
                                                    id="firstName"
                                                    value={dialogValue.firstName}
                                                    onChange={(event) =>
                                                        setDialogValue({
                                                            ...dialogValue,
                                                            firstName: event.target.value,
                                                        })
                                                    }
                                                    type="text"
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <InputLabel>{t('Middle Name')}</InputLabel>
                                                <OutlinedInput
                                                    size="small"
                                                    fullWidth
                                                    name="lastName"
                                                    label=""
                                                    id="middleName"
                                                    value={dialogValue.middleName}
                                                    onChange={(event) =>
                                                        setDialogValue({
                                                            ...dialogValue,
                                                            middleName: event.target.value,
                                                        })
                                                    }
                                                    type="text"
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <InputLabel>{t('Tax ID')}</InputLabel>
                                                <OutlinedInput
                                                    size="small"
                                                    fullWidth
                                                    label=""
                                                    name="taxId"
                                                    id="taxId"
                                                    value={dialogValue.taxId}
                                                    onChange={(event) =>
                                                        setDialogValue({
                                                            ...dialogValue,
                                                            taxId: event.target.value,
                                                        })
                                                    }
                                                    type="text"
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <InputLabel>{t('Birth Date')}</InputLabel>
                                                <OutlinedInput
                                                    size="small"
                                                    fullWidth
                                                    label=""
                                                    name="birthday"
                                                    id="birthday"
                                                    value={dialogValue.birthday}
                                                    onChange={(event) =>
                                                        setDialogValue({
                                                            ...dialogValue,
                                                            birthday: event.target.value,
                                                        })
                                                    }
                                                    type="date"
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <InputLabel>{t('Sex')}</InputLabel>
                                                <OutlinedInput
                                                    size="small"
                                                    fullWidth
                                                    label=""
                                                    name="sex"
                                                    id="sex"
                                                    value={dialogValue.sex}
                                                    onChange={(event) =>
                                                        setDialogValue({
                                                            ...dialogValue,
                                                            sex: event.target.value,
                                                        })
                                                    }
                                                    type="text"
                                                />
                                            </Grid>
                                        </Grid>
                                    </DialogContent>
                                    <DialogActions sx={{ mb: 2, mr: 2, pt: 0 }}>
                                        <Button type="submit">{t('Add')}</Button>
                                        <Button color="secondary" onClick={handleClose}>
                                            {t('Cancel')}
                                        </Button>
                                    </DialogActions>
                                </form>
                            </Dialog>
                        </>
                    );
                }}
            />
        </>
    );
};
