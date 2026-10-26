/* Browser admin script. Uses the dashboard's authenticated adminFetch wrapper. */
(() => {
  let revision=0, cachedHistory=null;
  const ids=['registeredUsers','dailyUsers','weeklyUsers','monthlyUsers'];
  const node=id=>document.getElementById(id);
  const svgNode=(tag,attributes,text)=>{
    const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attributes)) element.setAttribute(key,String(value));
    if(text!==undefined)element.textContent=text;
    return element;
  };
  function renderChart(history) {
    const svg=node('userActivityChart'); svg.replaceChildren();
    const narrow=svg.getBoundingClientRect().width<500;
    const chartWidth=narrow?400:800, right=chartWidth-20;
    svg.setAttribute('viewBox',`0 0 ${chartWidth} 300`);
    const max=Math.max(1,...history.flatMap(row=>[row.daily,row.weekly,row.monthly]).filter(value=>value!==null));
    const x=index=>50+index*(chartWidth-70)/29, y=value=>255-value*225/max;
    for(const value of [...new Set([0,Math.ceil(max/2),max])]) {
      svg.append(svgNode('line',{x1:50,x2:right,y1:y(value),y2:y(value),stroke:'#ddd'}));
      svg.append(svgNode('text',{x:42,y:y(value)+4,'text-anchor':'end',fill:'#444','font-size':13},value));
    }
    for(const index of (narrow?[0,14,29]:[0,7,14,21,29]))svg.append(svgNode('text',{x:x(index),y:282,'text-anchor':index===29?'end':'middle',fill:'#444','font-size':13},history[index].date.slice(5)));
    for(const [metric,color] of [['monthly','#7b3fb0'],['weekly','#167447'],['daily','#0067c0']]) {
      const points=history.map((row,index)=>row[metric]===null?null:[x(index),y(row[metric]),row]).filter(Boolean);
      if(points.length)svg.append(svgNode('polyline',{points:points.map(point=>point.slice(0,2).join(',')).join(' '),fill:'none',stroke:color,'stroke-width':2.5}));
      for(const [cx,cy,row] of points) {
        const circle=svgNode('circle',{cx,cy,r:3.2,fill:color});
        circle.append(svgNode('title',{},`${row.date}: ${metric} active = ${row[metric]}`)); svg.append(circle);
      }
    }
  }
  async function loadUsers() {
    const current=++revision;
    node('usersStatus').textContent='Refreshing user counts...';
    try {
      const response=await adminFetch('/admin/api/users.php');
      const data=await response.json(); if(current!==revision)return;
      if(!['total','daily','weekly','monthly'].every(key=>Number.isInteger(data[key]) && data[key]>=0) || !Array.isArray(data.history) || data.history.length!==30) throw Error('Invalid user statistics response');
      for(const [index,key] of ['total','daily','weekly','monthly'].entries())node(ids[index]).textContent=data[key].toLocaleString();
      node('usersStatus').textContent='Last refreshed: '+data.generatedAt+' · UTC. Server-recorded account activity.';
      node('usersTrackingNote').textContent='Tracking started '+data.trackingStartedAt+' UTC. '+(data.partialHistory?'The 7-day and 30-day windows are still accumulating history. Dates before tracking began are not shown as zero.':'Full 30-day tracking history is available.');
      cachedHistory=data.history;renderChart(data.history);
      node('userActivityTable').replaceChildren(...data.history.map(row=>{
        const tr=document.createElement('tr');
        for(const value of [row.date,row.daily,row.weekly,row.monthly]) { const td=document.createElement('td');td.textContent=value===null?'—':String(value);tr.append(td); }
        return tr;
      }));
    } catch(error) {
      if(current!==revision)return;
      for(const id of ids)node(id).textContent='Unavailable';
      cachedHistory=null;node('userActivityChart').replaceChildren();node('userActivityTable').replaceChildren();node('usersTrackingNote').textContent='';
      node('usersStatus').textContent='Unavailable: '+error.message+'. Previous values have been cleared.';
    }
  }
  document.addEventListener('click',event=>{if(event.target.closest('[data-section="users"],#refreshUsers'))loadUsers();});
  window.addEventListener('resize',()=>{if(cachedHistory)renderChart(cachedHistory);});
  setInterval(()=>{if(!document.hidden && !node('usersSection').classList.contains('d-none'))loadUsers();},60000);
})();
