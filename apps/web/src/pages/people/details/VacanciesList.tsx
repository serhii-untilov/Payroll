import {
    GridCallbackDetails,
    GridCellParams,
    GridColDef,
    GridRowParams,
    GridRowSelectionModel,
    MuiEvent,
    useGridApiRef,
} from '@mui/x-data-grid';
import { IPosition, date2view } from '@repo/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../../components/grid/DataGrid';
import { Toolbar } from '../../../components/layout/Toolbar';
import { Loading } from '../../../components/utility/Loading';
import useAppContext from '../../../hooks/useAppContext';
import { deletePosition, getVacanciesList } from '../../../services/position.service';

type Props = {
    companyId: number;
};

export function VacanciesList(props: Props) {
    const { companyId } = props;
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
    const gridRef = useGridApiRef();
    const navigate = useNavigate();
    const { payPeriod } = useAppContext();

    const columns: GridColDef[] = [
        {
            field: 'cardNumber',
            headerName: t('Card Number'),
            type: 'string',
            width: 120,
            sortable: true,
        },
        {
            field: 'name',
            headerName: t('Position'),
            type: 'string',
            width: 250,
            resizable: true,
            sortable: true,
            valueGetter: (params) => {
                return params.row?.personId ? params.row?.person?.fullName || '' : t('Vacancy');
            },
        },
        {
            field: 'job',
            headerName: t('Job'),
            type: 'string',
            width: 200,
            sortable: true,
            valueGetter: (params) => {
                return payPeriod
                    ? params.row?.history?.find(
                          (o) => o.dateFrom <= payPeriod && o.dateTo >= payPeriod,
                      )?.job?.name || ''
                    : '';
            },
        },
        {
            field: 'department',
            headerName: t('Department'),
            type: 'string',
            width: 300,
            sortable: true,
            valueGetter: (params) => {
                return payPeriod
                    ? params.row?.history?.find(
                          (o) => o.dateFrom <= payPeriod && o.dateTo >= payPeriod,
                      )?.department?.name || ''
                    : '';
            },
        },
        {
            field: 'workNorm',
            headerName: t('Work Norm'),
            type: 'string',
            width: 250,
            sortable: true,
            valueGetter: (params) => {
                return payPeriod
                    ? params.row?.history?.find(
                          (o) => o.dateFrom <= payPeriod && o.dateTo >= payPeriod,
                      )?.workNorm?.name || ''
                    : '';
            },
        },
        {
            field: 'paymentType',
            headerName: t('Payment Type'),
            type: 'string',
            width: 200,
            sortable: true,
            valueGetter: (params) => {
                return payPeriod
                    ? params.row?.history?.find(
                          (o) => o.dateFrom <= payPeriod && o.dateTo >= payPeriod,
                      )?.paymentType?.name || ''
                    : '';
            },
        },
        {
            field: 'wage',
            headerName: t('Wage'),
            type: 'number',
            width: 130,
            sortable: true,
            valueGetter: (params) => {
                return payPeriod
                    ? params.row?.history?.find(
                          (o) => o.dateFrom <= payPeriod && o.dateTo >= payPeriod,
                      )?.wage || ''
                    : '';
            },
        },
        {
            field: 'rate',
            headerName: t('Rate'),
            type: 'number',
            width: 130,
            sortable: true,
            valueGetter: (params) => {
                return payPeriod
                    ? params.row?.history?.find(
                          (o) => o.dateFrom <= payPeriod && o.dateTo >= payPeriod,
                      )?.rate || ''
                    : '';
            },
        },
        {
            field: 'dateFrom',
            headerName: t('Date From'),
            type: 'string',
            width: 200,
            sortable: true,
            valueGetter: (params) => {
                return date2view(params.value);
            },
        },
        {
            field: 'dateTo',
            headerName: t('Date To'),
            type: 'string',
            width: 200,
            sortable: true,
            valueGetter: (params) => {
                return date2view(params.value);
            },
        },
    ];

    const {
        data: positionList,
        isError: isPositionListError,
        isLoading: isPositionListLoading,
        error: positionListError,
    } = useQuery<IPosition[], Error>({
        queryKey: ['position', 'vacanciesList', { companyId, relations: true }],
        queryFn: async () => {
            return (
                await getVacanciesList({
                    companyId,
                    relations: true,
                    onPayPeriodDate: payPeriod || new Date(),
                })
            ).sort((a, b) =>
                (Number(a.cardNumber) || 2147483647) < (Number(b.cardNumber) || 2147483647)
                    ? -1
                    : (Number(a.cardNumber) || 2147483647) > (Number(b.cardNumber) || 2147483647)
                      ? 1
                      : 0,
            );
        },
        enabled: !!companyId && !!payPeriod,
    });

    if (isPositionListLoading) {
        return <Loading />;
    }

    if (isPositionListError) {
        return enqueueSnackbar(`${positionListError.name}\n${positionListError.message}`, {
            variant: 'error',
        });
    }

    const onAddPosition = () => {
        navigate('/people/position/');
    };

    const onEditPosition = (positionId: number) => {
        navigate(`/people/position/${positionId}`);
    };

    const submitCallback = (data: IPosition) => {
        queryClient.invalidateQueries({ queryKey: ['position'], refetchType: 'all' });
    };

    const onDeletePosition = async () => {
        for (const id of rowSelectionModel) {
            await deletePosition(+id);
        }
        queryClient.invalidateQueries({ queryKey: ['position'], refetchType: 'all' });
    };

    const onPrint = () => {
        gridRef.current.exportDataAsPrint();
    };

    const onExport = () => {
        gridRef.current.exportDataAsCsv();
    };

    const onShowHistory = () => {
        console.log('onShowHistory');
    };

    const onShowDeleted = () => {
        console.log('onShowDeleted');
    };

    const onRestoreDeleted = () => {
        console.log('onRestoreDeleted');
    };

    return (
        <>
            <Toolbar
                onAdd={onAddPosition}
                onPrint={positionList?.length ? onPrint : 'disabled'}
                onExport={positionList?.length ? onExport : 'disabled'}
                onDelete={rowSelectionModel.length ? onDeletePosition : 'disabled'}
                // onShowDeleted={'disabled'}
                onRestoreDeleted={'disabled'}
                onShowHistory={'disabled'}
            />
            <DataGrid
                columnVisibilityModel={{
                    // Hide columns, the other columns will remain visible
                    department: false,
                    dateFrom: false,
                    dateTo: false,
                }}
                apiRef={gridRef}
                rows={positionList || []}
                columns={columns}
                checkboxSelection={true}
                onRowSelectionModelChange={(newRowSelectionModel) => {
                    setRowSelectionModel(newRowSelectionModel);
                }}
                rowSelectionModel={rowSelectionModel}
                onCellKeyDown={(
                    params: GridCellParams,
                    event: MuiEvent<React.KeyboardEvent<HTMLElement>>,
                    details: GridCallbackDetails,
                ) => {
                    if (event.code === 'Enter') {
                        onEditPosition(params.row.id);
                    }
                }}
                onRowDoubleClick={(
                    params: GridRowParams,
                    event: MuiEvent,
                    details: GridCallbackDetails,
                ) => onEditPosition(params.row.id)}
            />
        </>
    );
}