import {
    ThemeOptions,
    ThemeProvider,
    createTheme,
    responsiveFontSizes,
    useMediaQuery,
} from '@mui/material';
import { ICompany } from '@repo/shared';
import { Dispatch, FC, ReactNode, createContext, useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import useLocale from '../hooks/useLocale';
import { defaultTheme } from '../themes/defaultTheme';
import { getUserCompanyList } from '../services/user.service';

export type AppContextType = {
    compactView: boolean;
    setCompactView: Dispatch<boolean>;
    company: ICompany | undefined;
    setCompany: Dispatch<ICompany>;
    theme: ThemeOptions;
    themeMode: string;
    setThemeMode: Dispatch<string>;
    switchThemeMode: () => void;
};

const AppContext = createContext<AppContextType>({
    compactView: false,
    setCompactView: () => {},
    company: undefined,
    setCompany: () => {},
    theme: {},
    themeMode: 'light',
    setThemeMode: () => {},
    switchThemeMode: () => {},
});

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider: FC<AppProviderProps> = (props) => {
    const { children } = props;
    const [compactView, setCompactView] = useState(false);
    const wideScreen = useMediaQuery('(min-width:900px)');
    const [companyList, setCompanyList] = useState<ICompany[]>([]);
    const [company, setCompany] = useState<ICompany>();
    const [themeMode, setThemeMode] = useState(localStorage.getItem('themeMode') || 'light');
    const { user } = useAuth();
    const { locale } = useLocale();
    const theme = useMemo(
        () => responsiveFontSizes(createTheme(defaultTheme(themeMode), locale.locale)),
        [themeMode, locale],
    );

    useEffect(() => {
        setCompactView(!wideScreen);
    }, [wideScreen]);

    useEffect(() => {
        const initCompanyList = async () => {
            const userCompanyList = user?.id ? await getUserCompanyList(user?.id) : [];
            setCompanyList(userCompanyList);
        };
        initCompanyList();
    }, [user]);

    useEffect(() => {
        const initCompany = () => {
            const companyId = +(localStorage.getItem('company') || 0);
            if (companyList.length) {
                setCompany(companyList.find((o) => o.id === companyId) || companyList[0]);
            }
        };
        initCompany();
    }, [companyList]);

    useEffect(() => {
        localStorage.setItem('themeMode', themeMode);
    }, [themeMode]);

    const switchThemeMode = () => {
        setThemeMode(themeMode === 'light' ? 'dark' : 'light');
    };

    return (
        <AppContext.Provider
            value={{
                compactView,
                setCompactView,
                company,
                setCompany,
                theme,
                themeMode,
                setThemeMode,
                switchThemeMode,
            }}
        >
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </AppContext.Provider>
    );
};

export default AppContext;
