import { Box, BoxProps, Typography } from '@mui/material';

export interface TabPanelProps extends BoxProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

export function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            sx={{
                // my: 1,
                // display: 'flex',
                // flexDirection: 'column',
                // minHeight: 0,
                flex: 1,
            }}
            {...other}
        >
            {value === index && (
                <Box
                    sx={{
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                    }}
                >
                    {children}
                </Box>
            )}
        </Box>
    );
}
