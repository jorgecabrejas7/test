import { forwardRef, useImperativeHandle, createRef } from "react";
import { DataGrid } from '@mui/x-data-grid';
import { useState, useEffect } from 'react';
import { protectedFetch } from "@/lib/apifetch";
import { getWindowDimensions } from "@/lib/functions";

const ExtendedTable = forwardRef(({ columns, paginationWithId = false, pageSize = 30, options, height = '100%' }, ref) => {
    const { session, fetchUrl, t } = options;
    const [data, setData] = useState({ loading: true, count: 0, list: [] });
    const [page, setPage] = useState({ current: 0, next: true });
    const [loading, setLoading] = useState(true);
    const [windowDimensions, setWindowDimensions] = useState(null);
    const [tableFullHeight, setTableFullHeight] = useState(null);
    const tableRef = createRef();

    useEffect(() => {
        if(tableRef.current && height === '100%') {
            const handleResize = () => {
                const dimensions = getWindowDimensions(window);
                
                if(dimensions) {
                    setWindowDimensions(dimensions);
                    setTableFullHeight(dimensions.height - tableRef.current.offsetTop - 160);
                }
            };

            if(window) {
                if(windowDimensions === null) handleResize();
                window.addEventListener('resize', handleResize);
            }
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [height, tableRef]);

    useImperativeHandle(ref, () => ({
        setRow(index, newRowData) {
            if(data.list.length > 0 && index >= 0 && index <= data.list.length - 1) {
                let newData = structuredClone(data);
                newData.list[index] = newRowData;
                setData(newData);
            }
        },
        getRow(index) {
            if(data.list.length > 0 && index >= 0 && index <= data.list.length - 1) {
                return data.list[index];
            }
        },
        deleteRow(index) {
            if(data.list.length > 0 && index >= 0 && index <= data.list.length - 1) {
                let newData = structuredClone(data);
                newData.list.splice(index, 1);
                setData(newData);
            }
        },
        getRowIndexById(id) {
            if(data.list.length > 0) {
                const index = data.list.findIndex((item) => item.id === id);
                return index;
            }
        }
    }));

    if(!session || !fetchUrl || !t)
    return <h4>ExtendedTable requires complete options param.</h4>;

    const fetchData = async () => {
        setLoading(true);
        setData({ ...data, list: [] });

        let searchParams = null;
        if(page.current === 0) searchParams = new URLSearchParams({ page_size: pageSize });
        else {
            if(paginationWithId) {
                if(page.next) {
                    const id = data.list[pageSize - 1].id;
                    searchParams = new URLSearchParams({ page_size: pageSize, starting_after: id });
                }
                else {
                    const id = data.list[0].id;
                    searchParams = new URLSearchParams({ page_size: pageSize, ending_before: id });
                }
            }
            else searchParams = new URLSearchParams({ page_size: pageSize, page: page.current });
        }

        const url = fetchUrl.includes('?') ? fetchUrl + "&" + searchParams : fetchUrl + "?" + searchParams;
        const res = await protectedFetch(session, url, "get", null, t);
        if(res.status === 200) {
            const data = await res.json();
            setData(data);
        }

        setLoading(false);
    };

    useEffect(() => {
        if(session.status === "authenticated") {
            fetchData();
        }
    }, [session.status, page]);

    return (
        <div style={{ height: tableFullHeight != null ? tableFullHeight : height, width: '100%' }} ref={ tableRef }>
            <DataGrid
                disableSelectionOnClick
                rows={ data.list }
                columns={ columns }
                pageSize={ pageSize }
                rowCount={ data.count }
                paginationMode="server"
                page={ page.current }
                onPageChange={ (newPage) => { !loading && setPage({ next: newPage > page.current, current: newPage }) } }
                sx={{
                    border: "1px solid rgba(0, 0, 0, 0.2);",
                    '& .MuiDataGrid-columnHeader .MuiDataGrid-columnSeparator': { display: "none" },
                    "&.MuiDataGrid-root .MuiDataGrid-columnHeader:focus, &.MuiDataGrid-root .MuiDataGrid-cell:focus": { outline: "none" }
                }}
                loading={ loading }
            />
        </div>
    );
});

export default ExtendedTable;