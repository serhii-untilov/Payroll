import { IPosition, ICreatePosition, IUpdatePosition } from '@repo/shared';
import { api } from '../api';
import authHeader from './auth-header';

export async function createPosition(position: ICreatePosition): Promise<IPosition> {
    const response = await api.post(`/api/positions/`, position, { headers: authHeader() });
    return response.data;
}

export async function getPositionList(
    companyId: number,
    relations: boolean = false,
): Promise<IPosition[]> {
    const response = await api.get(
        `/api/positions/?companyId=${companyId}&relations=${relations}`,
        {
            headers: authHeader(),
        },
    );
    return response.data;
}

export async function getPosition(id: number): Promise<IPosition> {
    const response = await api.get(`/api/positions/${id}`, { headers: authHeader() });
    return response.data;
}

export async function updatePosition(id: number, position: IUpdatePosition): Promise<IPosition> {
    const response = await api.patch(`/api/positions/${id}`, position, {
        headers: authHeader(),
    });
    return response.data;
}

export async function deletePosition(id: number): Promise<IPosition> {
    const response = await api.delete(`/api/positions/${id}`, { headers: authHeader() });
    return response.data;
}