document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  /*document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';*/

  const recipients = document.querySelector('#compose-recipients');
  recipients.value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
  const submit = document.querySelector('.subm-disable');

  submit.disabled = true;
  recipients.onkeyup = () => {
    if (recipients.value.length > 3) 
      submit.disabled = false;
    else 
      submit.disabled = true;
  }

  document.querySelector('#compose-form').onsubmit = () => sendmail();

  return false
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  switch(mailbox) {
    case 'sent':
      document.querySelector('#emails-view').innerHTML = `<h3>Sent</h3>`;
      break;
    case 'archive':
      document.querySelector('#emails-view').innerHTML = `<h3>Archived</h3>`;
      break;
    default:
      document.querySelector('#emails-view').innerHTML = `<h3>Inbox</h3>`;
  } 
  
  fetch('/emails/' + mailbox)
  .then(response => response.json())
  .then(emails => {
    const mailbox_div = document.createElement('div');
    mailbox_div.setAttribute('id', 'mailsblock');

    emails.forEach(email => {
      const letter_div = document.createElement('div');
      const address_field = document.createElement('span');
      const arch_button = document.createElement('button');

      if (mailbox === 'sent') {
        if (email.read === true)
          letter_div.setAttribute('class', 'mailgrid_sent read');
        else
          letter_div.setAttribute('class', 'mailgrid_sent unread');
        address_field.innerHTML = `To: ${email.recipients}`;
      }
      else {
        address_field.innerHTML = `${email.sender}`;
        if (email.read === true)
          letter_div.setAttribute('class', 'mailgrid read');
        else
          letter_div.setAttribute('class', 'mailgrid unread');
        if (mailbox === 'inbox')
          arch_button.className = 'archButton';
        else
          arch_button.className = 'unarchButton';
      }
      
      const subject_field = document.createElement('span');
      subject_field.innerHTML = `${email.subject}`;

      const datatime_field = document.createElement('span');
      datatime_field.innerHTML = `${email.timestamp}`;
      datatime_field.setAttribute('class', 'stamp');


      const linkdiv = document.createElement('div');
      linkdiv.setAttribute('class', 'linkdiv');

      if (mailbox === 'sent')
        letter_div.append(address_field, subject_field, datatime_field, linkdiv);
      if (mailbox === 'inbox')
        letter_div.append(arch_button, address_field, subject_field, datatime_field, linkdiv);
      if (mailbox === 'archive')
        letter_div.append(arch_button, address_field, subject_field, datatime_field, linkdiv);

      mailbox_div.append(letter_div);

      linkdiv.addEventListener('click', () => {
        readmail(email.id);
      });
    
      arch_button.addEventListener('click', () => {
        archive_email(email.id, email.archived);
      });

    });

    document.querySelector('#emails-view').append(mailbox_div);

  });
}

function sendmail() {
  
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: document.getElementById("compose-recipients").value,
      subject: document.getElementById("compose-subject").value,
      body: document.getElementById("compose-body").value
    })
  })
  .then(response => response.json())
  .then(result => {
    if (result.error) {
      document.querySelector('#error').setAttribute('class', "alert alert-danger");
      document.querySelector('#error').innerHTML = `${result.error}`;
      compose_email();
    }
    else {
      load_mailbox('sent');
    }
  });

  return false;
}

function readmail(id) {

  document.querySelector('#mailsblock').remove();
 
  
  fetch('/emails/' + id)
  .then(response => response.json())
  .then(email => {
  
    document.querySelector("h3").innerHTML = `${email.subject}`;

    const divLetter = document.createElement('div');

    const grid_div = document.createElement('div');
    grid_div.setAttribute('id', 'grid');
    
    const sender_field = document.createElement('div');
    sender_field.setAttribute("style","text-align: left;");
    sender_field.innerHTML = `<strong>Від:</strong> ${email.sender}`;

    const datatime_field = document.createElement('div');
    datatime_field.setAttribute("style", "text-align: right;");
    datatime_field.innerHTML = `${email.timestamp}`;

    grid_div.append(sender_field, datatime_field);


    const recipients_field = document.createElement('p');
    recipients_field.innerHTML = `<strong>Кому:</strong> ${email.recipients}`;

    const body_field = document.createElement('p');
    const text = email.body.split("\n");
    let body = '';
    for (let unit of text) {
      body += unit + '<br>'
    }

    body_field.innerHTML = body;

    const reply_btn = document.createElement('button');
    reply_btn.innerText = 'Відповісти';
    reply_btn.className = 'btn btn-outline-primary';

    divLetter.append(grid_div, recipients_field, body_field, reply_btn);
    document.querySelector('#emails-view').append(divLetter);

    reply_btn.addEventListener('click', () => reply_email(email));
    
  });

  fetch('/emails/' + id, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  });
  
}


function archive_email(mailID, archStatus) {
  fetch('/emails/'+ mailID, {
    method: 'PUT',
    body: JSON.stringify({
      archived: !archStatus
    })
  })
  .then(() => {
    load_mailbox('inbox')
  });   
}


function reply_email(email) {

  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  document.querySelector('#compose-recipients').value = email.sender;

  if (email.subject.slice(0,4) == 'Reply: ') 
    document.querySelector('#compose-subject').value = email.subject;
  else 
    document.querySelector('#compose-subject').value = 'Reply: ' + email.subject;
  
  const text = email.body.split("\n");
  let body = '';
  for (let unit of text) {
    body = body + '>' + unit + '\n';
  }
  
  document.querySelector('#compose-body').value = `\n${email.timestamp} ${email.sender} Writes:\n` + body;

  document.querySelector('#compose-form').onsubmit = () => sendmail();
}
