import Link from "next/link";
import { useRouter } from 'next/router';
import Icon from '@mui/material/Icon';
import styles from "@/styles/sidebar.module.css";
import React, { useState, useEffect } from 'react';
import { routes } from "@/lib/routes";
import Button from '@mui/material/Button';
import { useTranslation } from 'next-i18next';
import { signOut, useSession } from "next-auth/react";
import { protectedFetch } from "@/lib/apifetch";

const Sidebar = ({ toggle }) => {
    const session = useSession();

    const { t } = useTranslation('common');
    const { asPath } = useRouter();

    useEffect(() => {
        if(session.status === "authenticated") {
            if(session.data.user.role === "admin")
            setIsAdmin(true);
        }
    }, [session.status]);

    const [expandedRoutes, setExpandedRoutes] = useState([]);
    const [adminPage, setAdminPage] = useState(asPath.includes("/admin") ? true : undefined);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const includesAdmin = asPath.includes("/admin");
        setAdminPage(includesAdmin ? true : undefined);
        setExpandedRoutes(makeExpandedRoutes());
    }, [asPath]);

    useEffect(() => {
        if(expandedRoutes.length === 0) {
            setExpandedRoutes(makeExpandedRoutes());
        }
    }, [expandedRoutes]);

    const makeExpandedRoutes = () => {
        let expandedRoutes = [];
        for (let index = 0; index < routes.length; index++) {
            const route = routes[index];
            const path = removePathQueryParams(asPath);
            if(route.path.includes(path) || (route.subpages && route.subpages.filter(subpage => subpage.path.includes(path)).length > 0)) {
                expandedRoutes.push({ path: route.path, expanded: true });
            }
            else {
                expandedRoutes.push({ path: route.path, expanded: false });
            }   
        }
        return expandedRoutes;
    };

    const expandOrCollapse = (path, expanded = null) => {
        let expandedRoutesCopy = JSON.parse(JSON.stringify(expandedRoutes));
        for (let index = 0; index < expandedRoutesCopy.length; index++) {
            const route = expandedRoutesCopy[index];
            if(route.path.includes(path)) {
                if(expanded !== null) route.expanded = expanded;
                else route.expanded = !route.expanded;
            }
        }
        setExpandedRoutes(expandedRoutesCopy);
    };

    const removePathQueryParams = path => {
        const queryParamsPos = path.indexOf("?");
        if(queryParamsPos > -1) path = path.slice(0, queryParamsPos);
        return path;
    };

    const isPathExpanded = path => {
        let expanded = false;
        const route = expandedRoutes.filter(i => path.includes(i.path));
        if(route.length > 0) expanded = route[0].expanded;
        return expanded;
    }

    const logout = async () => {
        const user = session.data.user;
        await protectedFetch(session, process.env.BACK_API_URL + "session?" + new URLSearchParams({ id_user: user.id, session: user.session }), "put", JSON.stringify({ valid: false }), t);
        signOut();
    }

    return (
        <div className={ styles.sidebarContainer } style={{ display: toggle ? "flex" : "none" }}>
            <div className={ styles.sidebar + " d-flex flex-column justify-content-between h-100" }>
                <div>
                {
                    routes.filter(i => (i.admin === adminPage)).map(route => (
                        <div key={ route.title } className="d-flex justify-content-between mb-10">
                            <div className="d-flex flex-column">
                                {
                                    route.subpages && route.subpages.filter(i => i.display === undefined || i.display).length > 0 ?
                                        <div onClick={ () => expandOrCollapse(route.path) } className='d-flex aligns-items-center cursor-pointer'>
                                            {/* <Icon className='mr-10'>{ route.icon }</Icon> */}
                                            <span className={ "text-medium primary-color text-uppercase " + (asPath.includes(route.path) ? "fw-bold" : "") }>{ t(route.title) }</span>
                                        </div> :
                                        <Link href={ route.path } className='d-flex aligns-items-center cursor-pointer'>
                                            {/* <Icon className='mr-10'>{ route.icon }</Icon> */}
                                            <span className={ "text-medium primary-color text-uppercase " + (asPath.includes(route.path) ? "fw-bold" : "") }>{ t(route.title) }</span>
                                        </Link>
                                }
                                {
                                    route.subpages && 
                                    <div className={ isPathExpanded(route.path) ? styles.subpagesexpanded : styles.subpages }>
                                    {
                                        route.subpages.filter(i => i.display === undefined || i.display).map(subpage => (
                                            <Link key={ subpage.title } href={ subpage.path } className='d-flex aligns-items-center cursor-pointer'>
                                                {/* <Icon className='mr-10'></Icon> */}
                                                <span className={"text-medium secondary-color " + (removePathQueryParams(asPath) === subpage.path ? "fw-bold" : "") }>{ t(subpage.title) }</span>
                                            </Link>
                                        ))
                                    }
                                    </div>
                                }  
                            </div>
                            {
                                route.subpages && route.subpages.filter(i => i.display === undefined || i.display).length > 0 &&
                                <div onClick={ () => expandOrCollapse(route.path) } style={{ cursor: "pointer" }}>
                                    { isPathExpanded(route.path) ? <Icon>arrow_drop_down</Icon> : <Icon>arrow_left</Icon> }
                                </div>
                            }
                        </div>
                    ))
                }
                </div>
                <div className="d-flex flex-column">
                    {
                        isAdmin && (
                            adminPage ? 
                                <Link href={ "/home" } className="text-medium text-uppercase fw-bold mb-10 cursor-pointer">{ t('SIDEBAR.OPERATIONAL') }</Link> :
                                <Link href={ "/admin/users" } className="text-medium text-uppercase fw-bold mb-10 cursor-pointer">{ t('SIDEBAR.ADMIN') }</Link>
                        )
                    }
                    <Button variant="outlined" type="button" onClick={ () => logout() }>{ t('SIDEBAR.LOGOUT') }</Button>
                </div>
            </div>
            <div className={ styles.vbar }/>
        </div>
    );
};

export default Sidebar;