import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function identifyHandler(req: Request, res: Response) {
  const { email, phoneNumber } = req.body

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'email or phoneNumber required' })
  }

  // Find all contacts matching email or phone
  const matches = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        email ? { email } : {},
        phoneNumber ? { phoneNumber: String(phoneNumber) } : {},
      ].filter(o => Object.keys(o).length > 0),
    },
  })

  // No matches — create new primary contact
  if (matches.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkPrecedence: 'primary',
      },
    })
    return res.json({
      contact: {
        primaryContatctId: newContact.id,
        emails: newContact.email ? [newContact.email] : [],
        phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        secondaryContactIds: [],
      },
    })
  }

  // Get all primary IDs from matches
  const primaryIds = new Set<number>()
  for (const c of matches) {
    if (c.linkPrecedence === 'primary') primaryIds.add(c.id)
    else if (c.linkedId) primaryIds.add(c.linkedId)
  }

  // Fetch all contacts belonging to these primaries
  const allContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } },
      ],
    },
  })

  // Find the oldest primary
  const primaries = allContacts.filter(c => c.linkPrecedence === 'primary')
  primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const truePrimary = primaries[0]

  // Demote other primaries to secondary
  for (const p of primaries.slice(1)) {
    await prisma.contact.update({
      where: { id: p.id },
      data: { linkPrecedence: 'secondary', linkedId: truePrimary.id },
    })
    // Re-link their secondaries
    await prisma.contact.updateMany({
      where: { linkedId: p.id },
      data: { linkedId: truePrimary.id },
    })
  }

  // Fetch updated cluster
  const cluster = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
    },
  })

  // Check if incoming info is new
  const allEmails = new Set(cluster.map(c => c.email).filter(Boolean))
  const allPhones = new Set(cluster.map(c => c.phoneNumber).filter(Boolean))

  const isNewEmail = email && !allEmails.has(email)
  const isNewPhone = phoneNumber && !allPhones.has(String(phoneNumber))

  if (isNewEmail || isNewPhone) {
    await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkedId: truePrimary.id,
        linkPrecedence: 'secondary',
      },
    })
  }

  // Fetch final cluster
  const final = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
    },
    orderBy: { createdAt: 'asc' },
  })

  const emails: string[] = []
  const phones: string[] = []
  const secondaryIds: number[] = []

  if (truePrimary.email) emails.push(truePrimary.email)
  if (truePrimary.phoneNumber) phones.push(truePrimary.phoneNumber)

  for (const c of final) {
    if (c.id === truePrimary.id) continue
    secondaryIds.push(c.id)
    if (c.email && !emails.includes(c.email)) emails.push(c.email)
    if (c.phoneNumber && !phones.includes(c.phoneNumber)) phones.push(c.phoneNumber)
  }

  return res.json({
    contact: {
      primaryContatctId: truePrimary.id,
      emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaryIds,
    },
  })
}
