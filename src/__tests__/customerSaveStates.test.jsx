// @vitest-environment happy-dom
import React from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {AppDataCtx} from '../contexts.jsx';
const api=vi.hoisted(()=>({user:{id:'owner',email:'owner@example.invalid',user_metadata:{}},team:null,readThrows:false,tables:[],update:vi.fn(),write:vi.fn()}));
vi.mock('../auth.js',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:api.user}}}),getUser:async()=>({data:{user:api.user}}),updateUser:(...a)=>api.update(...a)},from:(table)=>{
 api.tables.push(table);let writing=false;
 const result=()=>{if(!writing && table==='team_members' && api.readThrows)throw Error('Unavailable');return writing?api.write(table):table==='team_accounts'?{data:api.team,error:api.team?null:{code:'PGRST116'}}:{data:[],error:null};};
 const chain={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>chain,single:async()=>result(),insert:()=>{writing=true;return chain;},then:(ok,bad)=>Promise.resolve(result()).then(ok,bad)};return chain;
}}}));
import Leaderboard from '../components/Leaderboard.jsx';
import TeamAccounts from '../components/TeamAccounts.jsx';
afterEach(()=>{cleanup();api.team=null;api.readThrows=false;api.user.user_metadata={};api.tables=[];vi.clearAllMocks();});
describe('Saved customer state',()=>{
 it('requires explicit leaderboard consent and preserves the previous preference after a rejected save',async()=>{
  api.update.mockResolvedValue({error:{message:'Unavailable'}});
  render(<AppDataCtx.Provider value={{appData:{ledger:[]}}}><Leaderboard/></AppDataCtx.Provider>);
  const control=screen.getByRole('checkbox');await waitFor(()=>expect(control.disabled).toBe(false));
  expect(control.checked).toBe(false);fireEvent.click(control);
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('previous setting is unchanged'));
  expect(control.checked).toBe(false);expect(api.tables).not.toContain('vault_events');
 });
 it('keeps a rejected team name and explains that no team was created',async()=>{
  api.write.mockReturnValue({data:null,error:{message:'Unavailable'}});
  render(<TeamAccounts/>);const input=await screen.findByPlaceholderText('Team name (e.g. Promo Squad)');
  fireEvent.change(input,{target:{value:'My team'}});fireEvent.click(screen.getByRole('button',{name:'Create Team'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('could not be created'));
  expect(input.value).toBe('My team');
 });
 it('keeps a rejected invitation email and does not pretend to save it',async()=>{
  api.team={id:'team',name:'My team'};api.write.mockReturnValue({data:null,error:{message:'Unavailable'}});
  render(<TeamAccounts/>);const input=await screen.findByPlaceholderText('teammate@email.com');
  fireEvent.change(input,{target:{value:'friend@example.invalid'}});fireEvent.click(screen.getByRole('button',{name:'Invite'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('could not be saved'));
  expect(input.value).toBe('friend@example.invalid');
 });
 it('reports a saved team after the owner membership request throws',async()=>{
  api.write.mockImplementation(table=>{if(table==='team_members')throw Error('Unavailable');return {data:{id:'saved-team',name:'My team'},error:null};});
  render(<TeamAccounts/>);const input=await screen.findByPlaceholderText('Team name (e.g. Promo Squad)');
  fireEvent.change(input,{target:{value:'My team'}});fireEvent.click(screen.getByRole('button',{name:'Create Team'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Your team was created'));
  expect(screen.getByText('My team')).toBeTruthy();
 });
 it('reports the saved invitation if the subsequent member refresh throws',async()=>{
  api.team={id:'team',name:'My team'};api.write.mockImplementation(()=>{api.readThrows=true;return {data:null,error:null};});
  render(<TeamAccounts/>);const input=await screen.findByPlaceholderText('teammate@email.com');
  fireEvent.change(input,{target:{value:'friend@example.invalid'}});fireEvent.click(screen.getByRole('button',{name:'Invite'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('invitation was recorded'));
  expect(input.value).toBe('');
 });
});
