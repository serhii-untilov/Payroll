import { yupResolver } from '@hookform/resolvers/yup';
import { Grid } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { IDepartment } from '@repo/shared';
import { maxDate, minDate } from '@repo/utils';
import { AxiosError } from 'axios';
import { enqueueSnackbar } from 'notistack';
import { Dispatch, Fragment, useEffect } from 'react';
import { SubmitHandler, useForm, useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from 'react-query';
import * as yup from 'yup';
import { FormInputDropdown } from '../../components/form/FormInputDropdown';
import { FormTextField } from '../../components/form/FormTextField';
import { Button } from '../../components/layout/Button';
import { Loading } from '../../components/utility/Loading';
import useAppContext from '../../hooks/useAppContext';
import useLocale from '../../hooks/useLocale';
import {
    createDepartment,
    getDepartment,
    getDepartmentList,
    updateDepartment,
} from '../../services/department.service';
import { getDirtyValues } from '../../services/utils';

export interface DepartmentFormParams {
    open: boolean;
    setOpen: Dispatch<boolean>;
    departmentId: number | null;
    submitCallback?: Dispatch<IDepartment>;
}

const formSchema = yup.object().shape({
    id: yup.number().nullable(),
    name: yup.string().required('Name is required'),
    companyId: yup.number().positive('Company is required').required(),
    dateFrom: yup.date(),
    dateTo: yup.date(),
    parentDepartmentId: yup.number().nullable(),
});

type FormType = yup.InferType<typeof formSchema>;

// To prevent Warning: A component is changing an uncontrolled input to be controlled.
const defaultValues: FormType = {
    id: null,
    name: '',
    companyId: 0,
    dateFrom: minDate(),
    dateTo: maxDate(),
    parentDepartmentId: null,
};

export default function DepartmentForm(params: DepartmentFormParams) {
    const { departmentId, submitCallback } = params;
    const { locale } = useLocale();
    const { t } = useTranslation();
    const { company } = useAppContext();
    const queryClient = useQueryClient();

    useEffect(() => {}, [company]);

    const {
        data: department,
        isError: isDepartmentError,
        isLoading: isDepartmentLoading,
        error: departmentError,
    } = useQuery<FormType, Error>({
        queryKey: ['department', departmentId],
        queryFn: async () => {
            return formSchema.cast(
                departmentId
                    ? await getDepartment(departmentId)
                    : { ...defaultValues, companyId: company?.id },
            );
        },
        enabled: !!company?.id,
        // suspense: true,
    });

    const {
        data: departmentList,
        isError: isDepartmentListError,
        isLoading: isDepartmentListLoading,
        error: departmentListError,
    } = useQuery<IDepartment[], Error>({
        queryKey: ['departmentList', company?.id],
        queryFn: async () => {
            return company?.id ? await getDepartmentList(company?.id) : [];
        },
        enabled: !!company?.id,
        // suspense: true,
    });

    const {
        control,
        handleSubmit,
        watch,
        reset,
        formState: { errors: formErrors },
    } = useForm({
        defaultValues: department || defaultValues,
        values: department || defaultValues,
        resolver: yupResolver<FormType>(formSchema),
        shouldFocusError: true,
    });

    const { dirtyFields, isDirty } = useFormState({ control });

    useEffect(() => {}, [locale]);

    useEffect(() => {
        formErrors.name?.message &&
            enqueueSnackbar(t(formErrors.name?.message), { variant: 'error' });
        formErrors.companyId?.message &&
            enqueueSnackbar(t(formErrors.companyId?.message), { variant: 'error' });
        formErrors.dateFrom?.message &&
            enqueueSnackbar(t(formErrors.dateFrom?.message), { variant: 'error' });
        formErrors.dateTo?.message &&
            enqueueSnackbar(t(formErrors.dateTo?.message), { variant: 'error' });
    }, [formErrors, t]);

    if (isDepartmentLoading || isDepartmentListLoading) {
        return <Loading />;
    }

    if (isDepartmentError) {
        return enqueueSnackbar(`${departmentError.name}\n${departmentError.message}`, {
            variant: 'error',
        });
    }

    if (isDepartmentListError) {
        return enqueueSnackbar(`${departmentListError.name}\n${departmentListError.message}`, {
            variant: 'error',
        });
    }

    const onSubmit: SubmitHandler<FormType> = async (data) => {
        if (!isDirty) return;
        const dirtyValues = getDirtyValues(dirtyFields, data);
        try {
            const department = data.id
                ? await updateDepartment(data.id, dirtyValues)
                : await createDepartment(data);
            reset(department);
            if (submitCallback) submitCallback(department);
            params.setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['department', departmentId] });
        } catch (e: unknown) {
            const error = e as AxiosError;
            enqueueSnackbar(`${error.code}\n${error.message}`, { variant: 'error' });
        }
    };

    const onCancel = () => {
        reset(department);
        params.setOpen(false);
        // queryClient.invalidateQueries({ queryKey: ['department', departmentId] });
    };

    return (
        <Fragment>
            <Dialog
                disableRestoreFocus
                open={params.open}
                onClose={() => {
                    params.setOpen(false);
                    reset(department);
                    queryClient.invalidateQueries({ queryKey: ['department', departmentId] });
                }}
                // PaperProps={{
                //     component: 'form',
                //     onSubmit: (event: FormEvent<HTMLFormElement>) => {
                //         event.preventDefault();
                //         handleSubmit(onSubmit);
                //         params.setOpen(false);
                //     },
                // }}
            >
                <DialogTitle>{t('Department')}</DialogTitle>
                <DialogContent>
                    {/* <DialogContentText>
                        To subscribe to this website, please enter your email address here. We will
                        send updates occasionally.
                    </DialogContentText> */}
                    <Grid container item xs={12} spacing={2}>
                        <Grid item xs={12}>
                            <FormTextField
                                control={control}
                                autoComplete="given-name"
                                name="name"
                                id="name"
                                label={t('Name')}
                                type="text"
                                autoFocus
                                sx={{ fontWeight: 'bold' }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormTextField
                                control={control}
                                autoComplete="given-name"
                                name="dateFrom"
                                id="dateFrom"
                                label={t('Date From')}
                                type="date"
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <FormTextField
                                control={control}
                                autoComplete="given-name"
                                name="dateTo"
                                id="dateTo"
                                label={t('Date To')}
                                type="date"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormInputDropdown
                                control={control}
                                label={t('Parent Department')}
                                name="parentDepartmentId"
                                autoComplete="parentDepartmentId"
                                type="number"
                                options={
                                    departmentList?.map((o) => {
                                        return { label: o.name, value: o.id };
                                    }) ?? []
                                }
                            />
                        </Grid>
                        {/* <Grid item xs={12} sx={{ mb: 2 }}>
                            <Grid container spacing={1}>
                                <Grid item>
                                    <Button type="submit" disabled={!isDirty}>
                                        {t('Update')}
                                    </Button>
                                </Grid>

                                <Grid item>
                                    {isDirty && <Button onClick={onCancel}>{t('Cancel')}</Button>}
                                </Grid>
                            </Grid>
                        </Grid> */}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ mb: 2, mr: 2, pt: 0 }}>
                    {/* <Button disabled={!isDirty} type="submit">
                        Subscribe
                    </Button> */}
                    <Button onClick={handleSubmit(onSubmit)}>{t('Update')}</Button>
                    <Button color="secondary" onClick={onCancel}>
                        {t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Fragment>
    );
}
