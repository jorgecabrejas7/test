export const routes = [
    {
        title: "ROUTES.HOME.TITLE", path: "/home", icon: "home",
    },
    {
        title: "ROUTES.PROJECTS.TITLE", path: "/projects", icon: "folder",
        subpages: [
            { title: "ROUTES.PROJECTS.SIMULATIONS", path: "/projects/simulations", icon: "edit", display: false, back: true },
            { title: "ROUTES.PROJECTS.SIMULATION", path: "/projects/simulation", icon: "api", display: false, back: true }
        ]
    },
    {
        title: "ROUTES.SOFTWARE.TITLE", path: "/software", icon: "api",
    },
    {
        title: "ROUTES.PROFILE.TITLE", path: "/profile", icon: "person",
        subpages: [
            { title: "ROUTES.PROFILE.PROFILE_SETTINGS", path: "/profile/settings", icon: "person" },
            { title: "ROUTES.PROFILE.ACCOUNT_BILLING", path: "/profile/account-and-billing", icon: "account_balance" },
            { title: "ROUTES.PROFILE.SESSIONS", path: "/profile/sessions", icon: "schedule" },
            { title: "ROUTES.PROFILE.HELP_CENTER", path: "/profile/help-center", icon: "help" },
            { title: "ROUTES.PROFILE.SUPPORT", path: "/profile/support", icon: "notifications" },
            { title: "ROUTES.PROFILE.TICKET_EDIT", path: "/profile/support/edit", icon: "edit", display: false }
        ]
    },
    {
        title: "ROUTES.ADMIN.TITLE", path: "/admin", icon: "admin_panel_settings", admin: true,
        subpages: [
            { title: "ROUTES.ADMIN.USER_MANAGEMENT", path: "/admin/users", icon: "group" },
            { title: "ROUTES.ADMIN.USER_EDIT", path: "/admin/users/edit", icon: "edit", display: false },
            { title: "ROUTES.ADMIN.SUBSCRIPTIONS", path: "/admin/subscriptions", icon: "card_membership" },
            { title: "ROUTES.ADMIN.PAYMENTS", path: "/admin/payments", icon: "payments" },
            { title: "ROUTES.ADMIN.SUPPORT", path: "/admin/support", icon: "notifications" },
            { title: "ROUTES.PROFILE.TICKET_EDIT", path: "/admin/support/edit", icon: "edit", display: false }
        ]
    }
];

export const getCurrentPageTitle = currentPath => {
    const queryParamsPos = currentPath.indexOf("?");
    if(queryParamsPos > -1) currentPath = currentPath.slice(0, queryParamsPos);

    for (let index = 0; index < routes.length; index++) {
        const element = routes[index];
        if(element.path === currentPath) return element.title;
        else {
            if(element.subpages) {
                for (let j = 0; j < element.subpages.length; j++) {
                    const subpage = element.subpages[j];
                    if(subpage.path === currentPath) return subpage.title;
                }
            }
        }
    }
};

export const currentPageHasBackButton = currentPath => {
    const queryParamsPos = currentPath.indexOf("?");
    if(queryParamsPos > -1) currentPath = currentPath.slice(0, queryParamsPos);

    for (let index = 0; index < routes.length; index++) {
        const element = routes[index];
        if(element.path === currentPath) return element.back || false;
        else {
            if(element.subpages) {
                for (let j = 0; j < element.subpages.length; j++) {
                    const subpage = element.subpages[j];
                    if(subpage.path === currentPath) return subpage.back || false;
                }
            }
        }
    }
};