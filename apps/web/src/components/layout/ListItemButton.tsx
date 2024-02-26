import * as React from 'react';
import { ListItem } from '@mui/material';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { grey } from '@mui/material/colors';
import { blue } from '@mui/material/colors';

interface ListItemButtonProps {
    icon?: React.ReactElement;
    primary: string;
    onClick: React.MouseEventHandler;
}

export function ListItemButton(props: ListItemButtonProps) {
    const { icon, primary, onClick } = props;

    return (
        <li>
            <ListItem
                button
                // dense
                component="button"
                onClick={onClick}
                sx={{
                    '&.active': {
                        color: 'white',
                        bgcolor: 'primary.main',
                        backgroundColor: 'primary.main',
                        opacity: 0.85,
                        borderRadius: '5px',
                        py: [0.5],
                        my: [0.3],
                    },
                    '&.active > .css-cveggr-MuiListItemIcon-root': {
                        color: 'white',
                        bgcolor: 'primary.main',
                        backgroundColor: 'primary.main',
                        opacity: 0.85,
                        borderRadius: '5px',
                        py: [0.5],
                        my: [0.3],
                    },
                    '&:hover': {
                        borderRadius: '5px',
                        py: [0.5],
                        my: [0.3],
                    },
                    transition: 'none',
                    height: 40,
                    py: [0.5],
                    my: [0.3],
                    px: [1],
                }}
            >
                {icon ? <ListItemIcon sx={{ minWidth: 38 }}>{icon}</ListItemIcon> : null}
                <ListItemText primary={primary} />
            </ListItem>
        </li>
    );
}