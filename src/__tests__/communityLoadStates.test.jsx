// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { AppDataCtx } from '../contexts.jsx';
const response=vi.hoisted(()=>({value:{data:[],error:null}}));
vi.mock('../auth.js',()=>({supabase:{auth:{getUser:async()=>({data:{user:null}})},from:()=>{
  const chain={select:()=>chain,eq:()=>chain,order:()=>chain,limit:async()=>response.value};return chain;
}}}));
import CommunityPromoBoard from '../components/CommunityPromoBoard.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
afterEach(cleanup);
describe('Community service states',()=>{
  it('shows a load failure rather than an empty promotion result',async()=>{
    response.value={data:null,error:{message:'Unavailable'}};
    render(<AppDataCtx.Provider value={{appData:{}}}><CommunityPromoBoard /></AppDataCtx.Provider>);
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('could not be loaded'));
    expect(screen.queryByText(/No promos/i)).toBeNull();
    expect(screen.getByRole('button',{name:'Try again'})).toBeTruthy();
  });
  it('shows a failure rather than telling the visitor to be first on a leaderboard',async()=>{
    response.value={data:null,error:{message:'Unavailable'}};
    render(<AppDataCtx.Provider value={{appData:{ledger:[]}}}><Leaderboard /></AppDataCtx.Provider>);
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('could not be loaded'));
    expect(screen.queryByText('Be the first on the leaderboard')).toBeNull();
  });
});
