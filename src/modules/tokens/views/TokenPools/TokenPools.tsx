// Copyright © 2022 Kaleido, Inc.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  Button,
  CircularProgress,
  Grid,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TablePagination,
  Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Box } from '@mui/system';
import dayjs from 'dayjs';
import React, { useContext, useEffect, useState } from 'react';
import Jazzicon from 'react-jazzicon';
import { useHistory } from 'react-router';
import { ArrayParam, useQueryParam, withDefault } from 'use-query-params';
import { DataTable } from '../../../../core/components/DataTable/DataTable';
import { DataTableEmptyState } from '../../../../core/components/DataTable/DataTableEmptyState';
import { FilterDisplay } from '../../../../core/components/FilterDisplay';
import { FilterModal } from '../../../../core/components/FilterModal';
import { ApplicationContext } from '../../../../core/contexts/ApplicationContext';
import { NamespaceContext } from '../../../../core/contexts/NamespaceContext';
import { IDataTableRecord, ITokenPool } from '../../../../core/interfaces';
import {
  fetchWithCredentials,
  jsNumberForAddress,
} from '../../../../core/utils';
import { useTokensTranslation } from '../../registration';

const PAGE_LIMITS = [10, 25];

export const TokenPools: () => JSX.Element = () => {
  const history = useHistory();
  const classes = useStyles();
  const { t } = useTokensTranslation();
  const [loading, setLoading] = useState(false);
  const [poolsUpdated, setPoolsUpdated] = useState(0);
  const { selectedNamespace } = useContext(NamespaceContext);
  const { lastEvent } = useContext(ApplicationContext);
  const [tokenPools, setTokenPools] = useState<ITokenPool[]>([]);
  const [tokenPoolsTotal, setTokenPoolsTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_LIMITS[0]);
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(
    null
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterString, setFilterString] = useState('');
  const [filterQuery, setFilterQuery] = useQueryParam(
    'filters',
    withDefault(ArrayParam, [])
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    if (
      newPage > currentPage &&
      rowsPerPage * (currentPage + 1) >= tokenPoolsTotal
    ) {
      return;
    }
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCurrentPage(0);
    setRowsPerPage(+event.target.value);
  };

  const pagination = (
    <TablePagination
      component="div"
      count={-1}
      rowsPerPage={rowsPerPage}
      page={currentPage}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      rowsPerPageOptions={PAGE_LIMITS}
      labelDisplayedRows={({ from, to }) => `${from} - ${to}`}
      className={classes.pagination}
    />
  );

  useEffect(() => {
    if (lastEvent && lastEvent.data) {
      const eventJson = JSON.parse(lastEvent.data);
      if (eventJson.type === 'token_pool_confirmed') {
        setPoolsUpdated(new Date().getTime());
      }
    }
  }, [lastEvent]);

  useEffect(() => {
    setLoading(true);
    fetchWithCredentials(
      `/api/v1/namespaces/${selectedNamespace}/tokens/pools?limit=${rowsPerPage}&skip=${
        rowsPerPage * currentPage
      }${filterString !== undefined ? filterString : ''}&count`
    )
      .then(async (tokenPoolsResponse) => {
        if (tokenPoolsResponse.ok) {
          const tokenPools = await tokenPoolsResponse.json();
          setTokenPoolsTotal(tokenPools.total);
          setTokenPools(tokenPools.items);
        } else {
          console.log('error fetching token pools');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [rowsPerPage, currentPage, selectedNamespace, poolsUpdated, filterString]);

  useEffect(() => {
    // set filters if they are present in the URL
    if (filterQuery.length !== 0) {
      setActiveFilters(filterQuery as string[]);
    }
  }, [setActiveFilters, filterQuery]);

  useEffect(() => {
    //set query param state
    setFilterQuery(activeFilters, 'replaceIn');
    if (activeFilters.length === 0) {
      setFilterString('');
      return;
    }

    setFilterString(`&${activeFilters.join('&')}`);
  }, [activeFilters, setFilterQuery]);

  const handleOpenFilter = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleAddFilter = (filter: string) => {
    setActiveFilters((activeFilters) => [...activeFilters, filter]);
  };

  const tokenPoolsColumnHeaders = [
    t('name'),
    t('type'),
    t('standard'),
    t('protocolID'),
    t('created'),
  ];

  const filterFields = [
    'connector',
    'created',
    'id',
    'message',
    'name',
    'protocolid',
    'standard',
    'state',
    'symbol',
    'tx.id',
    'tx.type',
    'type',
  ];

  const tokenPoolsRecords: IDataTableRecord[] = tokenPools.map(
    (tokenPool: ITokenPool) => ({
      key: tokenPool.id,
      columns: [
        {
          value: (
            <ListItem>
              <ListItemAvatar>
                <Jazzicon
                  diameter={34}
                  seed={jsNumberForAddress(tokenPool.id)}
                />
              </ListItemAvatar>
              <ListItemText primary={tokenPool.name} />
            </ListItem>
          ),
        },
        {
          value: t(tokenPool.type),
        },
        {
          value: tokenPool.standard,
        },
        {
          value: tokenPool.protocolId,
        },
        { value: dayjs(tokenPool.created).format('MM/DD/YYYY h:mm A') },
      ],
      onClick: () => {
        history.push(
          `/namespace/${selectedNamespace}/tokens/tokenPools/${tokenPool.name}`
        );
      },
    })
  );

  if (loading) {
    return (
      <Box className={classes.centeredContent}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Grid container justifyContent="center">
        <Grid container item wrap="nowrap" direction="column">
          <Grid container item direction="row">
            <Grid className={classes.headerContainer} item>
              <Typography variant="h4" className={classes.header}>
                {t('tokenPools')}
              </Typography>
            </Grid>
            <Box className={classes.separator} />
            <Grid item>
              <Button
                className={classes.filterButton}
                variant="outlined"
                onClick={handleOpenFilter}
              >
                <Typography>{t('filter')}</Typography>
              </Button>
            </Grid>
          </Grid>
          {activeFilters.length > 0 && (
            <Grid container className={classes.filterContainer}>
              <FilterDisplay
                filters={activeFilters}
                setFilters={setActiveFilters}
              />
            </Grid>
          )}
          <Grid container item>
            {tokenPools.length ? (
              <DataTable
                stickyHeader={true}
                minHeight="300px"
                maxHeight="calc(100vh - 340px)"
                columnHeaders={tokenPoolsColumnHeaders}
                records={tokenPoolsRecords}
                {...{ pagination }}
              />
            ) : (
              <DataTableEmptyState
                message={t('noTokenPoolsToDisplay')}
              ></DataTableEmptyState>
            )}
          </Grid>
        </Grid>
      </Grid>
      {filterAnchor && (
        <FilterModal
          anchor={filterAnchor}
          onClose={() => {
            setFilterAnchor(null);
          }}
          fields={filterFields}
          addFilter={handleAddFilter}
        />
      )}
    </>
  );
};

const useStyles = makeStyles((theme) => ({
  centeredContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 300px)',
    overflow: 'auto',
  },
  header: {
    fontWeight: 'bold',
  },
  headerContainer: {
    marginBottom: theme.spacing(5),
  },
  pagination: {
    color: theme.palette.text.secondary,
  },
  separator: {
    flexGrow: 1,
  },
  filterContainer: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  filterButton: {
    height: 40,
  },
}));
