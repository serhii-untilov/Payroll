import { yupResolver } from '@hookform/resolvers/yup';
import { Grid } from '@mui/material';
import {
    IPerson,
    IPosition,
    IPositionHistory,
    PaymentGroup,
    formatDate,
    getMinDate,
    maxDate,
    minDate,
} from '@repo/shared';
import { AxiosError } from 'axios';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from 'react-query';
import * as yup from 'yup';
import { FormDateField } from '../../../components/form/FormDateField';
import { FormTextField } from '../../../components/form/FormTextField';
import TabLayout from '../../../components/layout/TabLayout';
import { Toolbar } from '../../../components/layout/Toolbar';
import { SelectDepartment } from '../../../components/select/SelectDepartment';
import { SelectJob } from '../../../components/select/SelectJob';
import { SelectPaymentType } from '../../../components/select/SelectPaymentType';
import { SelectWorkNorm } from '../../../components/select/SelectWorkNorm';
import useAppContext from '../../../hooks/useAppContext';
import useLocale from '../../../hooks/useLocale';
import { getPerson } from '../../../services/person.service';
import { createPosition, getPosition, updatePosition } from '../../../services/position.service';
import {
    createPositionHistory,
    getPositionHistoryOnDate,
    updatePositionHistory,
} from '../../../services/positionHistory.service';
import { getDirtyValues, getObjectByType } from '../../../services/utils';
import { getDefaultWorkNormId } from '../../../services/workNorm.service';
import { getDefaultBasicPaymentTypeId } from '../../../services/paymentType.service';

const formSchema = yup.object().shape({
    // Position
    id: yup.number().nullable(),
    companyId: yup.number().positive('Company is required').required(),
    cardNumber: yup.string().nullable(),
    sequenceNumber: yup.number().nullable(),
    description: yup.string().nullable(),
    personId: yup.number().nullable(),
    dateFrom: yup.date().required(),
    dateTo: yup.date().required(),
    deletedUserId: yup.number().nullable(),
    name: yup.string().nullable(),
    // A PositionHistory record actual on the current PayPeriod
    departmentId: yup.number().nullable(),
    jobId: yup.number().nullable(),
    workNormId: yup.number().nullable(),
    paymentTypeId: yup.number().nullable(),
    wage: yup.number().nullable(),
    rate: yup.number().nullable(),
});

type FormType = yup.InferType<typeof formSchema>;

interface Props {
    positionId: number | null | undefined;
}

export function JobAndPay({ positionId }: Props) {
    const { locale } = useLocale();
    const { t } = useTranslation();
    const { company, payPeriod } = useAppContext();
    const queryClient = useQueryClient();
    const [position, setPosition] = useState<Partial<IPosition>>({});
    const [positionHistory, setPositionHistory] = useState<Partial<IPositionHistory>>({});
    const [person, setPerson] = useState<Partial<IPerson>>({});
    const [defaultFormData, setDefaultFormData] = useState<Partial<FormType>>({});

    useEffect(() => {}, [company]);

    const getFormData = async (positionId) => {
        if (positionId) {
            const position = await getPosition({ id: positionId, relations: true });
            setPosition(position);
            const positionHistory =
                (await getPositionHistoryOnDate({
                    positionId,
                    relations: true,
                    onDate: getMinDate(position.dateTo as Date, payPeriod as Date),
                })) || {};
            setPositionHistory(positionHistory);
            const person = position?.personId ? (await getPerson(position?.personId)) || {} : {};
            setPerson(person);
            const defaultPosition = {
                ...positionHistory,
                ...position,
            };
            setDefaultFormData(defaultPosition);
            return formSchema.cast(defaultPosition);
        } else {
            const workNormId = await getDefaultWorkNormId();
            const paymentTypeId = await getDefaultBasicPaymentTypeId();
            const defaultPosition = {
                companyId: company?.id,
                workNormId,
                paymentTypeId,
                rate: 1,
                dateFrom: minDate(),
                dateTo: maxDate(),
            };
            setDefaultFormData(defaultPosition);
            return formSchema.cast(defaultPosition);
        }
    };

    const {
        data: formData,
        isError: isFormError,
        error: formError,
    } = useQuery<FormType, Error>({
        queryKey: ['Job & Pay', positionId],
        queryFn: async () => {
            return await getFormData(positionId);
        },
        enabled: !!company && !!payPeriod && !!defaultFormData,
    });

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors: formErrors },
    } = useForm({
        defaultValues: formData,
        values: formData,
        resolver: yupResolver<FormType>(formSchema),
        shouldFocusError: true,
    });

    const { dirtyFields, isDirty } = useFormState({
        control,
    });

    useEffect(() => {}, [locale]);

    useEffect(() => {
        formErrors.companyId?.message &&
            enqueueSnackbar(t(formErrors.companyId?.message), { variant: 'error' });
        formErrors.dateFrom?.message &&
            enqueueSnackbar(t(formErrors.dateFrom?.message), { variant: 'error' });
        formErrors.dateTo?.message &&
            enqueueSnackbar(t(formErrors.dateTo?.message), { variant: 'error' });
    }, [formErrors, t]);

    if (isFormError) {
        return enqueueSnackbar(`${formError.name}\n${formError.message}`, {
            variant: 'error',
        });
    }

    const onSubmit: SubmitHandler<FormType> = async (data) => {
        if (!isDirty) {
            reset(formData);
        }
        if (!formData) {
            return;
        }
        const positionData = formData_Position(data);
        const positionHistoryData = {
            ...positionHistory,
            ...formData_PositionHistory(data),
        };
        const positionDirtyValues = getDirtyValues(dirtyFields, positionData);
        const positionHistoryDirtyValues = getDirtyValues(dirtyFields, positionHistoryData);
        try {
            let pos = position;
            if (Object.keys(positionDirtyValues).length) {
                pos = positionData.id
                    ? await updatePosition(positionData.id, positionDirtyValues)
                    : await createPosition(positionData);
            }
            if (Object.keys(positionHistoryDirtyValues).length) {
                if (!pos.id) {
                    throw Error('positionId not defined');
                }
                positionHistory.id
                    ? await updatePositionHistory(positionHistory.id, positionHistoryDirtyValues)
                    : await createPositionHistory({
                          positionId: pos.id,
                          dateFrom: minDate(),
                          dateTo: maxDate(),
                          ...positionHistoryDirtyValues,
                      });
            }
            reset(await getFormData(formData.id));
            positionId = formData.id;
            queryClient.invalidateQueries({ queryKey: ['Job & Pay', positionId] });
        } catch (e: unknown) {
            const error = e as AxiosError;
            enqueueSnackbar(`${error.code}\n${error.message}`, { variant: 'error' });
        }
    };

    const onSave = () => {
        handleSubmit(onSubmit);
    };

    const onCancel = () => {
        // reset(defaultPosition);
        queryClient.invalidateQueries({ queryKey: ['Job & Pay', positionId] });
    };

    const onDelete = () => {
        console.log('onDelete');
    };

    const onRestoreDeleted = () => {
        console.log('onRestoreDeleted');
    };

    const onPrint = () => {
        console.log('onPrint');
    };

    const onExport = () => {
        console.log('onExport');
    };

    return (
        <>
            <TabLayout>
                <Toolbar
                    onSave={isDirty ? handleSubmit(onSubmit) : 'disabled'}
                    onCancel={isDirty ? onCancel : 'disabled'}
                    onDelete={formData?.id ? onDelete : 'disabled'}
                    onRestoreDeleted={formData?.deletedUserId ? onRestoreDeleted : 'disabled'}
                    onPrint={formData?.id ? onPrint : 'disabled'}
                    onExport={formData?.id ? onExport : 'disabled'}
                    onShowHistory={'disabled'}
                />

                <Grid container xs={12} spacing={2}>
                    <Grid item xs={12} md={6}>
                        <FormTextField
                            control={control}
                            autoComplete="full-name"
                            name="name"
                            id="name"
                            label={t('Full Name')}
                            type="text"
                            autoFocus
                            sx={{ fontWeight: 'bold' }}
                            placeholder={t('Vacancy')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormTextField
                            control={control}
                            name="cardNumber"
                            id="cardNumber"
                            label={t('Card Number')}
                            type="text"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormTextField
                            control={control}
                            name="sequenceNumber"
                            id="sequenceNumber"
                            label={t('Sequence Number')}
                            type="number"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <SelectJob
                            companyId={company?.id}
                            control={control}
                            name="jobId"
                            id="jobId"
                            label={t('Job')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <SelectDepartment
                            companyId={company?.id}
                            control={control}
                            name="departmentId"
                            id="departmentId"
                            label={t('Department')}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <SelectWorkNorm
                            companyId={company?.id}
                            control={control}
                            name="workNormId"
                            id="workNormId"
                            label={t('Work Norm')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <SelectPaymentType
                            companyId={company?.id}
                            control={control}
                            name="paymentTypeId"
                            id="paymentTypeId"
                            label={t('Payment Type')}
                            filter={{ groups: [PaymentGroup.BASIC] }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <FormTextField
                            control={control}
                            name="wage"
                            id="wage"
                            label={t('Wage')}
                            type="number"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormTextField
                            control={control}
                            name="Rate"
                            id="Rate"
                            label={t('Rate')}
                            type="number"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <FormDateField
                            control={control}
                            name="dateFrom"
                            id="dateFrom"
                            label={t('Date From')}
                            defaultValue={formatDate(minDate())}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <FormDateField
                            control={control}
                            name="dateTo"
                            id="dateTo"
                            label={t('Date To')}
                            defaultValue={formatDate(maxDate())}
                        />
                    </Grid>
                </Grid>
            </TabLayout>
        </>
    );
}

function formData_Position(formData: FormType): IPosition {
    const {
        id,
        companyId,
        cardNumber,
        sequenceNumber,
        description,
        personId,
        dateFrom,
        dateTo,
        deletedUserId,
        name,
    } = formData;
    return {
        id,
        companyId,
        cardNumber,
        sequenceNumber,
        description,
        personId,
        dateFrom,
        dateTo,
        deletedUserId,
        name,
    };
}

function formData_PositionHistory(data: FormType): Partial<IPositionHistory> {
    const { departmentId, jobId, workNormId, paymentTypeId, wage, rate } = data;
    return { departmentId, jobId, workNormId, paymentTypeId, wage, rate };
}
