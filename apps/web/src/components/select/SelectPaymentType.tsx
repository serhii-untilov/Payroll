import { enqueueSnackbar } from 'notistack';
import { FormAutocomplete } from '../form/FormAutocomplete';
import { IPaymentType, IPaymentTypeFilter } from '@repo/shared';
import { getPaymentTypeList } from '../../services/paymentType.service';
import { useQuery } from 'react-query';

interface Props {
    companyId: number | undefined;
    control: any;
    label?: string;
    id?: string;
    name?: string;
    filter?: IPaymentTypeFilter;
}

export function SelectPaymentType({ companyId, control, label, id, name, filter }: Props) {
    const {
        data: paymentTypeList,
        isError: isPaymentTypeListError,
        error: paymentTypeListError,
    } = useQuery<IPaymentType[], Error>({
        queryKey: ['paymentTypeList', companyId, filter],
        queryFn: async () => {
            return companyId ? await getPaymentTypeList(filter) : [];
        },
        enabled: !!companyId,
    });

    if (isPaymentTypeListError) {
        return enqueueSnackbar(`${paymentTypeListError.name}\n${paymentTypeListError.message}`, {
            variant: 'error',
        });
    }

    return (
        <FormAutocomplete
            control={control}
            label={label || ''}
            name={name || id || ''}
            id={id || name || ''}
            autoComplete="paymentType"
            options={
                paymentTypeList?.map((o) => {
                    return { label: o.name, value: o.id };
                }) ?? []
            }
        />
    );
}