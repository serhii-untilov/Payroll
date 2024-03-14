import { useQuery, useQueryClient } from 'react-query';
import { CompanyDetailsProps } from './CompanyDetails';
import { ICompany, IDepartment } from '@repo/shared';
import { getDepartmentList } from '../../services/department.service';
import { Loading } from '../../components/utility/Loading';
import { enqueueSnackbar } from 'notistack';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { FormDate } from '../../components/data/Date';
import { useTranslation } from 'react-i18next';
import { TableToolbar } from '../../components/layout/TableToolbar';
import {
    GridCallbackDetails,
    GridCellParams,
    GridColDef,
    GridRowParams,
    MuiEvent,
} from '@mui/x-data-grid';
import DepartmentForm from './DepartmentForm';
import { KeyboardEvent, useState } from 'react';
import { dateView, maxDate, minDate } from '@repo/utils';
import { DataGrid } from '../../components/data/DataGrid';

export function CompanyDepartments(params: CompanyDetailsProps) {
    const { companyId } = params;
    const { t } = useTranslation();
    const [openForm, setOpenForm] = useState(false);
    const [checkboxSelection, setCheckboxSelection] = useState(false);
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const columns: GridColDef[] = [
        // { field: 'id', headerName: t('ID'), type: 'number', width: 70 },
        {
            field: 'name',
            headerName: t('Name'),
            type: 'string',
            width: 400,
            sortable: true,
        },
        {
            field: 'dateFrom',
            headerName: t('Date From'),
            type: 'string',
            width: 200,
            sortable: true,
            valueGetter: (params) => {
                return dateView(params.value);
            },
        },
        {
            field: 'dateTo',
            headerName: t('Date To'),
            type: 'string',
            width: 200,
            sortable: true,
            valueGetter: (params) => {
                return dateView(params.value);
            },
        },
        {
            field: 'parentDepartment',
            headerName: t('Parent Department'),
            type: 'string',
            width: 300,
            sortable: true,
            valueGetter: (params) => {
                return params.row.parentDepartment?.name || '';
            },
        },
    ];

    const {
        data: departmentList,
        isError: isDepartmentListError,
        isLoading: isDepartmentListLoading,
        error: departmentListError,
    } = useQuery<IDepartment[], Error>({
        queryKey: ['departmentList-relations', companyId],
        queryFn: async () => {
            return await getDepartmentList(companyId, true);
        },
        enabled: !!companyId,
    });

    if (isDepartmentListLoading) {
        return <Loading />;
    }

    if (isDepartmentListError) {
        return enqueueSnackbar(`${departmentListError.name}\n${departmentListError.message}`, {
            variant: 'error',
        });
    }

    const onAddDepartment = () => {
        setDepartmentId(null);
        setOpenForm(true);
    };

    const onDeleteDepartment = () => {
        console.log('onDeleteDepartment');
    };

    const onEditDepartment = (departmentId: number) => {
        setDepartmentId(departmentId);
        setOpenForm(true);
    };

    const submitCallback = (data: IDepartment) => {
        queryClient.invalidateQueries({ queryKey: ['departmentList-relations', companyId] });
    };

    return (
        <>
            <TableToolbar
                onAdd={onAddDepartment}
                onDelete={onDeleteDepartment}
                deleteDisabled={true}
                onCheckboxSelection={() => {
                    setCheckboxSelection(!checkboxSelection);
                }}
                checkboxSelectionDisabled={false}
            />
            <DataGrid
                rows={departmentList || []}
                columns={columns}
                checkboxSelection={checkboxSelection}
                onCellKeyDown={(
                    params: GridCellParams,
                    event: MuiEvent<React.KeyboardEvent<HTMLElement>>,
                    details: GridCallbackDetails,
                ) => {
                    if (event.code === 'Enter') {
                        onEditDepartment(params.row.id);
                    }
                }}
                onRowDoubleClick={(
                    params: GridRowParams,
                    event: MuiEvent,
                    details: GridCallbackDetails,
                ) => onEditDepartment(params.row.id)}
            />
            <DepartmentForm
                open={openForm}
                setOpen={setOpenForm}
                departmentId={departmentId}
                submitCallback={submitCallback}
            />
        </>
    );
}
