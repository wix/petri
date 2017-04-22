package com.wixpress.guineapig.drivers

import java.io.StringWriter

import com.wixpress.petri.experiments.jackson.ObjectMapperFactory
import org.apache.http.HttpResponse
import org.apache.http.client.HttpClient
import org.apache.http.client.methods._
import org.apache.http.entity.{ContentType, StringEntity}
import org.apache.http.impl.client.HttpClientBuilder
import org.apache.http.util.EntityUtils

class HttpDriver {

  val client: HttpClient = HttpClientBuilder.create.build

  val om = ObjectMapperFactory.makeObjectMapper()

  def responseFor(request: HttpRequestBase): JsonResponse = {
    request.setHeader("Accept", "application/json")
    new JsonResponse(EntityUtils.toString(client.execute(request).getEntity, "UTF-8"))
  }

  def get(uri: String): JsonResponse = {
    val request = new HttpGet(uri)
    responseFor(request)
  }


  def post(uri: String): JsonResponse = {
    val postMethod = new HttpPost(uri)
    responseFor(postMethod)
  }

  def post[T](uri: String, jsonPayload: T): JsonResponse = {
    executeMethod(new HttpPost(uri), jsonPayload)
  }


  def put[T](uri: String, jsonPayload: T): JsonResponse = {
    executeMethod(new HttpPut(uri), jsonPayload)
  }

  def getRaw(uri: String): HttpResponse = {
    val httpMethod = new HttpGet(uri)
    client.execute(httpMethod)
  }

  private def executeMethod[T](httpMethod: HttpEntityEnclosingRequestBase, jsonPayload: T): JsonResponse = {
    val stringWriter = new StringWriter()
    om.writeValue(stringWriter, jsonPayload)
    val requestEntity = new StringEntity(stringWriter.toString, ContentType.APPLICATION_JSON)

    httpMethod.setEntity(requestEntity)
    httpMethod.setHeader("Content-Type", "application/json")

    responseFor(httpMethod)
  }

  def postText[T](uri: String, payload: String): JsonResponse = {
    val postMethod = new HttpPost(uri)
    val requestEntity = new StringEntity(payload)

    postMethod.setEntity(requestEntity)
    postMethod.setHeader("Content-Type", "text/plain")

    responseFor(postMethod)
  }
}
