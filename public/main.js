async function submitCode() {
  const code = document.getElementById('accessCode').value;
  const res = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();

  const message = document.getElementById('message');
  if (data.success) {
    message.textContent = 'Access granted!';
    document.getElementById('access-container').style.display = 'none';
    document.getElementById('links-container').style.display = 'block';
    populateLinks(data.links);
  } else {
    message.textContent = 'Invalid code.';
  }
}

function populateLinks(links) {
  const list = document.getElementById('linksList');
  links.forEach(link => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.textContent = link.title;
    a.target = '_blank';
    li.appendChild(a);
    list.appendChild(li);
  });
}
